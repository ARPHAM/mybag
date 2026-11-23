import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const sort = searchParams.get('sort');

    const query: any = { user_id: decoded.userId };

    if (category) {
      if (category === 'other') {
        query.$or = [
          { category: 'other' },
          { category: null },
          { category: '' },
          { category: { $exists: false } }
        ];
      } else {
        query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      }
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        query.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const sortOption: any = sort === 'amount'
      ? { amount: -1, date: -1 }
      : sort === 'date_asc'
      ? { date: 1, createdAt: 1 }
      : { date: -1, createdAt: -1 };

    let queryBuilder = Transaction.find(query).sort(sortOption);
    if (limit && limit > 0) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const transactions = await queryBuilder;
    return NextResponse.json(transactions, {
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
