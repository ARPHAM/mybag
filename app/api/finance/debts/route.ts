import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Debt from '@/models/Debt';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const debts = await Debt.find({ user_id: decoded.userId }).sort({ createdAt: -1 });
    return NextResponse.json(debts, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30', // Cache 15s
      }
    });
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
    const { personName, type, amount, dueDate, wallet_id } = body;

    const cleanAmount = Math.round(Number(amount));
    if (!personName || !type || !cleanAmount || !wallet_id || cleanAmount <= 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }

    let wallet;
    if (type === 'lent') {
      wallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId, balance: { $gte: cleanAmount } },
        { $inc: { balance: -cleanAmount } },
        { returnDocument: 'after' }
      );
      if (!wallet) {
        const exists = await Wallet.findOne({ _id: wallet_id, user_id: decoded.userId });
        if (!exists) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
        return NextResponse.json({ error: 'Số dư ví không đủ để cho vay' }, { status: 400 });
      }
    } else if (type === 'borrowed') {
      wallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId },
        { $inc: { balance: cleanAmount } },
        { returnDocument: 'after' }
      );
      if (!wallet) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
    }

    let txId;
    try {
      const tx = await Transaction.create({
        user_id: decoded.userId,
        type: type === 'lent' ? 'expense' : 'income',
        amount: cleanAmount,
        date: new Date(),
        description: type === 'lent' ? `Cho ${personName} vay tiền` : `Vay tiền của ${personName}`,
        category: 'debt_loan',
        wallet_id,
        walletName: wallet?.name || ''
      });
      txId = tx._id;

      const debt = await Debt.create({
        user_id: decoded.userId,
        personName,
        type,
        totalAmount: cleanAmount,
        remainingAmount: cleanAmount,
        dueDate: dueDate ? new Date(`${dueDate.split('T')[0]}T12:00:00.000Z`) : undefined,
        status: 'unpaid',
        history: []
      });

      return NextResponse.json(debt, { status: 201 });
    } catch (err: any) {
      // Rollback ví và transaction nếu tạo Debt thất bại
      if (type === 'lent') {
        await Wallet.findOneAndUpdate(
          { _id: wallet_id, user_id: decoded.userId },
          { $inc: { balance: cleanAmount } }
        );
      } else {
        await Wallet.findOneAndUpdate(
          { _id: wallet_id, user_id: decoded.userId },
          { $inc: { balance: -cleanAmount } }
        );
      }
      if (txId) {
        await Transaction.findByIdAndDelete(txId);
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
