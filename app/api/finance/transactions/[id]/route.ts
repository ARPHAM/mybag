import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const transaction = await Transaction.findOne({ _id: params.id, user_id: decoded.userId });
    if (!transaction) return NextResponse.json({ error: 'Giao dịch không tồn tại' }, { status: 404 });

    const { type, amount, wallet_id, to_wallet_id } = transaction;

    if (type === 'income') {
      const wallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } }
      );
      if (!wallet) return NextResponse.json({ error: 'Không thể hủy do ví không đủ số dư để hoàn trả' }, { status: 400 });
    } 
    else if (type === 'expense') {
      await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId },
        { $inc: { balance: amount } }
      );
    } 
    else if (type === 'transfer') {
      const destWallet = await Wallet.findOneAndUpdate(
        { _id: to_wallet_id, user_id: decoded.userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } }
      );
      if (!destWallet) return NextResponse.json({ error: 'Ví nhận không đủ số dư để hoàn tiền' }, { status: 400 });

      await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId },
        { $inc: { balance: amount } }
      );
    }

    await Transaction.deleteOne({ _id: params.id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const oldTx = await Transaction.findOne({ _id: params.id, user_id: decoded.userId });
    if (!oldTx) return NextResponse.json({ error: 'Giao dịch không tồn tại' }, { status: 404 });

    const body = await req.json();
    const { type, amount, date, description, category, wallet_id, to_wallet_id } = body;

    if (!type || !amount || !description || amount <= 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }

    if (type === 'transfer' && (!wallet_id || !to_wallet_id || wallet_id === to_wallet_id)) {
      return NextResponse.json({ error: 'Thông tin ví chuyển/nhận không hợp lệ' }, { status: 400 });
    }
    if (type !== 'transfer' && !wallet_id) {
      return NextResponse.json({ error: 'Cần chọn ví' }, { status: 400 });
    }

    // 1. Revert old transaction
    let revertSuccess = true;
    if (oldTx.type === 'income') {
      const w = await Wallet.findOneAndUpdate({ _id: oldTx.wallet_id, user_id: decoded.userId, balance: { $gte: oldTx.amount } }, { $inc: { balance: -oldTx.amount } });
      if (!w) revertSuccess = false;
    } else if (oldTx.type === 'expense') {
      await Wallet.findOneAndUpdate({ _id: oldTx.wallet_id, user_id: decoded.userId }, { $inc: { balance: oldTx.amount } });
    } else if (oldTx.type === 'transfer') {
      const w = await Wallet.findOneAndUpdate({ _id: oldTx.to_wallet_id, user_id: decoded.userId, balance: { $gte: oldTx.amount } }, { $inc: { balance: -oldTx.amount } });
      if (!w) {
        revertSuccess = false;
      } else {
        await Wallet.findOneAndUpdate({ _id: oldTx.wallet_id, user_id: decoded.userId }, { $inc: { balance: oldTx.amount } });
      }
    }

    if (!revertSuccess) {
      return NextResponse.json({ error: 'Không thể sửa vì số dư ví không đủ để hoàn tác giao dịch cũ' }, { status: 400 });
    }

    // Rollback function in case applying new transaction fails
    const rollbackRevert = async () => {
      if (oldTx.type === 'income') {
        await Wallet.findOneAndUpdate({ _id: oldTx.wallet_id, user_id: decoded.userId }, { $inc: { balance: oldTx.amount } });
      } else if (oldTx.type === 'expense') {
        await Wallet.findOneAndUpdate({ _id: oldTx.wallet_id, user_id: decoded.userId }, { $inc: { balance: -oldTx.amount } });
      } else if (oldTx.type === 'transfer') {
        await Wallet.findOneAndUpdate({ _id: oldTx.to_wallet_id, user_id: decoded.userId }, { $inc: { balance: oldTx.amount } });
        await Wallet.findOneAndUpdate({ _id: oldTx.wallet_id, user_id: decoded.userId }, { $inc: { balance: -oldTx.amount } });
      }
    };

    // 2. Apply new transaction
    let walletName = '';
    if (type === 'income') {
      const w = await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: decoded.userId }, { $inc: { balance: amount } }, { returnDocument: 'after' });
      if (!w) {
        await rollbackRevert();
        return NextResponse.json({ error: 'Ví không tồn tại' }, { status: 404 });
      }
      walletName = w.name;
    } else if (type === 'expense') {
      const w = await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: decoded.userId, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
      if (!w) {
        await rollbackRevert();
        return NextResponse.json({ error: 'Số dư không đủ' }, { status: 400 });
      }
      walletName = w.name;
    } else if (type === 'transfer') {
      const sourceWallet = await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: decoded.userId, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
      if (!sourceWallet) {
        await rollbackRevert();
        return NextResponse.json({ error: 'Số dư ví nguồn không đủ' }, { status: 400 });
      }
      const destWallet = await Wallet.findOneAndUpdate({ _id: to_wallet_id, user_id: decoded.userId }, { $inc: { balance: amount } }, { returnDocument: 'after' });
      if (!destWallet) {
        await Wallet.findByIdAndUpdate(wallet_id, { $inc: { balance: amount } }); // Hoàn lại nguồn
        await rollbackRevert();
        return NextResponse.json({ error: 'Ví nhận không tồn tại' }, { status: 404 });
      }
      walletName = `${sourceWallet.name} -> ${destWallet.name}`;
    }

    // 3. Update Transaction record
    oldTx.type = type;
    oldTx.amount = amount;
    oldTx.date = date ? new Date(`${date.split('T')[0]}T12:00:00.000Z`) : new Date();
    oldTx.description = description;
    oldTx.category = category;
    oldTx.wallet_id = wallet_id;
    oldTx.to_wallet_id = type === 'transfer' ? to_wallet_id : undefined;
    oldTx.walletName = walletName;

    await oldTx.save();

    return NextResponse.json(oldTx, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
