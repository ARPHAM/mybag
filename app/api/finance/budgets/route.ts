import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Budget from '@/models/Budget';
import Transaction from '@/models/Transaction';
import { verifyToken } from '@/lib/auth';
import { getVnDateStr } from '@/lib/vnTime';
import { getRequestNow } from '@/lib/simClock';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const url = new URL(req.url);
    const month = url.searchParams.get('month') || getVnDateStr(getRequestNow(req)).slice(0, 7);

    // Fetch budgets for this month
    const budgets = await Budget.find({ user_id: decoded.userId, month }).lean();

    // Calculate spent for each category in this month (Vietnam timezone UTC+7)
    const [mYear, mNum] = month.split('-').map(Number);
    const nextYear = mNum === 12 ? mYear + 1 : mYear;
    const nextMonth = mNum === 12 ? 1 : mNum + 1;
    const startDate = new Date(`${month}-01T00:00:00+07:00`);
    const endDate = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+07:00`);

    const spendings = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(decoded.userId),
          type: 'expense',
          date: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$category', 'other'] },
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    const spentMap = spendings.reduce((acc, curr) => {
      const catKey = (curr._id || '').toString().trim().toLowerCase();
      acc[catKey] = (acc[catKey] || 0) + curr.totalSpent;
      return acc;
    }, {} as Record<string, number>);

    // Merge spent into budget
    const result = budgets.map(b => {
      const cleanCat = (b.category || '').trim().toLowerCase();
      return {
        ...b,
        spent: spentMap[cleanCat] || 0
      };
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120', // Cache 1 phút
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

    const { name, category, month, limit, upsert } = await req.json();

    const rawLimit = Number(limit);
    const resolvedMonth = (typeof month === 'string' && month.trim()) ? month.trim() : getVnDateStr(getRequestNow(req)).slice(0, 7);
    if (!name || !category || !/^\d{4}-(0[1-9]|1[0-2])$/.test(resolvedMonth) || limit === undefined || isNaN(rawLimit) || rawLimit < 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }
    const cleanLimit = Math.round(rawLimit);
    const cleanCategory = category.trim().toLowerCase();

    // Check if budget for this category and month already exists
    const existing = await Budget.findOne({ user_id: decoded.userId, category: cleanCategory, month: resolvedMonth });
    if (existing) {
      if (upsert) {
        existing.limit = cleanLimit;
        if (name && name !== cleanCategory) existing.name = name;
        await existing.save();
        return NextResponse.json({ ...existing.toObject(), spent: 0 }, { status: 200 });
      }
      return NextResponse.json({ error: 'Danh mục này đã có hạn mức trong tháng' }, { status: 400 });
    }

    const budget = await Budget.create({
      user_id: decoded.userId,
      name,
      category: cleanCategory,
      month: resolvedMonth,
      limit: cleanLimit
    });

    return NextResponse.json({ ...budget.toObject(), spent: 0 }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
