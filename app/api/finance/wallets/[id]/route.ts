import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import Inventory from '@/models/Inventory';
import { verifyToken } from '@/lib/auth';
import { getRequestNow } from '@/lib/simClock';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }
    const body = await req.json();
    const { name, type, balance, color } = body;

    const wallet = await Wallet.findOne({ _id: id, user_id: decoded.userId });
    if (!wallet) {
      return NextResponse.json({ error: 'Không tìm thấy ví' }, { status: 404 });
    }

    if (name) wallet.name = name;
    if (type) wallet.type = type;
    if (balance !== undefined) {
      if (balance < 0) return NextResponse.json({ error: 'Số dư không được âm' }, { status: 400 });
      wallet.balance = balance;
    }
    if (color) wallet.color = color;

    await wallet.save();

    return NextResponse.json(wallet, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }
    const totalWallets = await Wallet.countDocuments({ user_id: decoded.userId });
    if (totalWallets <= 1) {
      return NextResponse.json({ error: 'Không thể xóa ví duy nhất còn lại của bạn' }, { status: 400 });
    }

    const wallet = await Wallet.findOne({ _id: id, user_id: decoded.userId });
    if (!wallet) {
      return NextResponse.json({ error: 'Không tìm thấy ví' }, { status: 404 });
    }

    let targetWalletId: string | null = null;
    try {
      const body = await req.json();
      targetWalletId = body.target_wallet_id || null;
    } catch {
      // Body is optional in DELETE
    }

    if (!targetWalletId) {
      const url = new URL(req.url);
      targetWalletId = url.searchParams.get('target_wallet_id') || url.searchParams.get('transfer_to');
    }

    if (wallet.balance > 0 && !targetWalletId) {
      return NextResponse.json({
        error: 'Ví hiện tại còn số dư. Vui lòng chọn ví đích để chuyển tiền và dữ liệu trước khi xóa'
      }, { status: 400 });
    }

    if (targetWalletId) {
      if (targetWalletId === wallet._id.toString()) {
        return NextResponse.json({ error: 'Ví nhận không thể trùng với ví bị xóa' }, { status: 400 });
      }

      const targetWallet = await Wallet.findOne({ _id: targetWalletId, user_id: decoded.userId });
      if (!targetWallet) {
        return NextResponse.json({ error: 'Ví chuyển nhượng đích không tồn tại' }, { status: 404 });
      }

      // 1. Chuyển số dư sang ví nhận (nếu có số dư)
      if (wallet.balance > 0) {
        const transferAmount = Math.round(wallet.balance);
        await Wallet.updateOne(
          { _id: targetWallet._id },
          { $inc: { balance: transferAmount } }
        );

        await Transaction.create({
          user_id: decoded.userId,
          type: 'transfer',
          amount: transferAmount,
          date: getRequestNow(req),
          description: `Chuyển số dư khi đóng ví: ${wallet.name} -> ${targetWallet.name}`,
          category: 'transfer',
          wallet_id: wallet._id,
          to_wallet_id: targetWallet._id,
          walletName: `${wallet.name} -> ${targetWallet.name}`
        });
      }

      // 2. Chuyển nhượng tham chiếu các món hàng trong kho (Inventory)
      await Inventory.updateMany(
        { user_id: decoded.userId, wallet_id: wallet._id },
        { $set: { wallet_id: targetWallet._id, walletName: targetWallet.name } }
      );

      // 3. Chuyển nhượng tham chiếu lịch sử chi tiêu (Transaction)
      await Transaction.updateMany(
        { user_id: decoded.userId, wallet_id: wallet._id },
        { $set: { wallet_id: targetWallet._id } }
      );
      await Transaction.updateMany(
        { user_id: decoded.userId, to_wallet_id: wallet._id },
        { $set: { to_wallet_id: targetWallet._id } }
      );
    } else {
      // Số dư = 0 và không chỉ định ví đích: tự động tìm 1 ví khác của user để chuyển nhượng tham chiếu
      const fallbackWallet = await Wallet.findOne({ _id: { $ne: wallet._id }, user_id: decoded.userId });
      if (fallbackWallet) {
        await Inventory.updateMany(
          { user_id: decoded.userId, wallet_id: wallet._id },
          { $set: { wallet_id: fallbackWallet._id, walletName: fallbackWallet.name } }
        );
        await Transaction.updateMany(
          { user_id: decoded.userId, wallet_id: wallet._id },
          { $set: { wallet_id: fallbackWallet._id } }
        );
        await Transaction.updateMany(
          { user_id: decoded.userId, to_wallet_id: wallet._id },
          { $set: { to_wallet_id: fallbackWallet._id } }
        );
      }
    }

    // 4. Xóa ví an toàn
    await Wallet.deleteOne({ _id: wallet._id });

    return NextResponse.json({ message: 'Xóa ví và chuyển nhượng dữ liệu thành công' }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
