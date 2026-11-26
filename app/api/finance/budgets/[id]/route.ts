import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Budget from '@/models/Budget';
import { verifyToken } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { name, category, limit } = body;

    const cleanLimit = Math.max(0, Math.round(Number(limit)));
    if (!name || !category || limit === undefined || cleanLimit < 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }

    const { id } = await params;
    const cleanCategory = category.trim().toLowerCase();

    // Check duplicate category in same month
    const currentBudget = await Budget.findOne({ _id: id, user_id: decoded.userId });
    if (!currentBudget) {
      return NextResponse.json({ error: 'Không tìm thấy hạn mức' }, { status: 404 });
    }

    const existing = await Budget.findOne({
      _id: { $ne: id },
      user_id: decoded.userId,
      category: cleanCategory,
      month: currentBudget.month
    });
    if (existing) {
      return NextResponse.json({ error: 'Danh mục này đã có hạn mức trong tháng' }, { status: 400 });
    }

    currentBudget.name = name;
    currentBudget.category = cleanCategory;
    currentBudget.limit = cleanLimit;
    await currentBudget.save();

    return NextResponse.json(currentBudget);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const { id } = await params;
    const budget = await Budget.findOneAndDelete({ _id: id, user_id: decoded.userId });

    if (!budget) {
      return NextResponse.json({ error: 'Không tìm thấy hạn mức' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
