import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import ShoppingItem from '@/models/ShoppingItem';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    // Auto-delete items checked more than 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await ShoppingItem.deleteMany({
      user_id: decoded.userId,
      checked: true,
      $or: [
        { checkedAt: { $lte: twentyFourHoursAgo } },
        { checkedAt: null, updatedAt: { $lte: twentyFourHoursAgo } }
      ]
    });

    const items = await ShoppingItem.find({ user_id: decoded.userId }).sort({ createdAt: -1 });
    return NextResponse.json(items, {
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

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    const body = await req.json();
    const { name, quantity, unit, category } = body;

    const nameStr = typeof name === 'string' ? name.trim() : '';
    const unitStr = typeof unit === 'string' ? unit.trim() : '';
    const qty = Number(quantity || 1);

    if (!nameStr || nameStr.length > 200) {
      return NextResponse.json({ error: 'Tên món hàng không hợp lệ (1-200 ký tự)' }, { status: 400 });
    }
    if (!unitStr || unitStr.length > 50) {
      return NextResponse.json({ error: 'Đơn vị không hợp lệ' }, { status: 400 });
    }
    if (!['food', 'household', 'other'].includes(category)) {
      return NextResponse.json({ error: 'Danh mục không hợp lệ' }, { status: 400 });
    }
    if (isNaN(qty) || qty <= 0 || qty > 10000) {
      return NextResponse.json({ error: 'Số lượng phải từ 1 đến 10,000' }, { status: 400 });
    }

    const newItem = await ShoppingItem.create({
      user_id: decoded.userId,
      name: nameStr,
      quantity: qty,
      unit: unitStr,
      category,
      checked: false,
    });

    return NextResponse.json({ message: 'Đã thêm món hàng!', item: newItem }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
