import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const transactions = await Transaction.find({ user_id: decoded.userId }).sort({ date: -1, createdAt: -1 });
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

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

    let walletName = '';

    if (type === 'income') {
      const wallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId },
        { $inc: { balance: amount } },
        { returnDocument: 'after' }
      );
      if (!wallet) return NextResponse.json({ error: 'Ví không tồn tại' }, { status: 404 });
      walletName = wallet.name;
    } 
    else if (type === 'expense') {
      // Atomic query: chỉ trừ nếu số dư >= amount
      const wallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { returnDocument: 'after' }
      );
      if (!wallet) {
        // Kiểm tra xem ví có tồn tại hay không
        const exists = await Wallet.findById(wallet_id);
        if (!exists) return NextResponse.json({ error: 'Ví không tồn tại' }, { status: 404 });
        return NextResponse.json({ error: 'Số dư không đủ để thực hiện giao dịch' }, { status: 400 });
      }
      walletName = wallet.name;
    } 
    else if (type === 'transfer') {
      // 1. Trừ tiền ví nguồn (an toàn)
      const sourceWallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { returnDocument: 'after' }
      );
      if (!sourceWallet) {
        const exists = await Wallet.findById(wallet_id);
        if (!exists) return NextResponse.json({ error: 'Ví nguồn không tồn tại' }, { status: 404 });
        return NextResponse.json({ error: 'Số dư ví nguồn không đủ' }, { status: 400 });
      }

      // 2. Cộng tiền ví nhận
      const destWallet = await Wallet.findOneAndUpdate(
        { _id: to_wallet_id, user_id: decoded.userId },
        { $inc: { balance: amount } },
        { returnDocument: 'after' }
      );

      // Nếu lỗi ví nhận, Rollback ví nguồn (Rất hiếm khi xảy ra)
      if (!destWallet) {
        await Wallet.findByIdAndUpdate(wallet_id, { $inc: { balance: amount } });
        return NextResponse.json({ error: 'Ví nhận không tồn tại, đã hoàn tiền' }, { status: 404 });
      }
      walletName = `${sourceWallet.name} -> ${destWallet.name}`;
    }

    const transaction = await Transaction.create({
      user_id: decoded.userId,
      type,
      amount,
      date: date ? new Date(`${date.split('T')[0]}T12:00:00.000Z`) : new Date(),
      description,
      category,
      wallet_id,
      to_wallet_id: type === 'transfer' ? to_wallet_id : undefined,
      walletName
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
