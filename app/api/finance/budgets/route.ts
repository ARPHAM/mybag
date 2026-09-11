import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Budget from '@/models/Budget';
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

    const url = new URL(req.url);
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // Fetch budgets for this month
    const budgets = await Budget.find({ user_id: decoded.userId, month }).lean();

    // Calculate spent for each category in this month
    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const spendings = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(decoded.userId),
          type: 'expense',
          date: { $gte: startDate, $lt: endDate },
          category: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    const spentMap = spendings.reduce((acc, curr) => {
      acc[curr._id] = curr.totalSpent;
      return acc;
    }, {} as Record<string, number>);

    // Merge spent into budget
    const result = budgets.map(b => ({
      ...b,
      spent: spentMap[b.category] || 0
    }));

    return NextResponse.json(result);
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

    const { name, category, month, limit } = await req.json();

    if (!name || !category || !month || limit === undefined || limit < 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }

    // Check if budget for this category and month already exists
    const existing = await Budget.findOne({ user_id: decoded.userId, category, month });
    if (existing) {
      return NextResponse.json({ error: 'Danh mục này đã có hạn mức trong tháng' }, { status: 400 });
    }

    const budget = await Budget.create({
      user_id: decoded.userId,
      name,
      category,
      month,
      limit
    });

    return NextResponse.json({ ...budget.toObject(), spent: 0 }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
