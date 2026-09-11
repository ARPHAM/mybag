import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Debt from '@/models/Debt';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const debts = await Debt.find({ user_id: decoded.userId }).sort({ createdAt: -1 });
    return NextResponse.json(debts);
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

    if (!personName || !type || !amount || !wallet_id || amount <= 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }

    const wallet = await Wallet.findOne({ _id: wallet_id, user_id: decoded.userId });
    if (!wallet) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });

    // Handle cash flow and Transaction creation
    if (type === 'lent') {
      if (wallet.balance < amount) {
        return NextResponse.json({ error: 'Số dư ví không đủ để cho vay' }, { status: 400 });
      }
      wallet.balance -= amount;
      await wallet.save();

      await Transaction.create({
        user_id: decoded.userId,
        type: 'expense',
        amount,
        date: new Date(),
        description: `Cho ${personName} vay tiền`,
        category: 'other', // Or null
        wallet_id,
        walletName: wallet.name
      });
    } else if (type === 'borrowed') {
      wallet.balance += amount;
      await wallet.save();

      await Transaction.create({
        user_id: decoded.userId,
        type: 'income',
        amount,
        date: new Date(),
        description: `Vay tiền của ${personName}`,
        category: 'other',
        wallet_id,
        walletName: wallet.name
      });
    }

    // Create Debt record
    const debt = await Debt.create({
      user_id: decoded.userId,
      personName,
      type,
      totalAmount: amount,
      remainingAmount: amount,
      dueDate: dueDate ? new Date(`${dueDate.split('T')[0]}T12:00:00.000Z`) : undefined,
      status: 'unpaid',
      history: []
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
