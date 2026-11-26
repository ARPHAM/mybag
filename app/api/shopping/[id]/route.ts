import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import ShoppingItem from '@/models/ShoppingItem';
import { verifyToken } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();

    // Whitelist allowed fields to prevent Mass Assignment / IDOR tampering
    const updateData: any = {};

    if (body.name !== undefined) {
      const nameStr = String(body.name).trim();
      if (!nameStr || nameStr.length > 200) {
        return NextResponse.json({ error: 'Tên món hàng không hợp lệ (1-200 ký tự)' }, { status: 400 });
      }
      updateData.name = nameStr;
    }

    if (body.quantity !== undefined) {
      const qty = Number(body.quantity);
      if (isNaN(qty) || qty <= 0 || qty > 10000) {
        return NextResponse.json({ error: 'Số lượng phải từ 1 đến 10,000' }, { status: 400 });
      }
      updateData.quantity = qty;
    }

    if (body.unit !== undefined) {
      const unitStr = String(body.unit).trim();
      if (!unitStr || unitStr.length > 50) {
        return NextResponse.json({ error: 'Đơn vị không hợp lệ' }, { status: 400 });
      }
      updateData.unit = unitStr;
    }

    if (body.category !== undefined) {
      if (!['food', 'household', 'other'].includes(body.category)) {
        return NextResponse.json({ error: 'Danh mục không hợp lệ' }, { status: 400 });
      }
      updateData.category = body.category;
    }

    if (typeof body.checked === 'boolean') {
      updateData.checked = body.checked;
      updateData.checkedAt = body.checked ? new Date() : null;
    }

    const item = await ShoppingItem.findOneAndUpdate(
      { _id: id, user_id: decoded.userId },
      { $set: updateData },
      { new: true }
    );

    if (!item) {
      return NextResponse.json({ error: 'Không tìm thấy item' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã cập nhật item', item });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
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

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const deletedItem = await ShoppingItem.findOneAndDelete({ _id: id, user_id: decoded.userId });

    if (!deletedItem) {
      return NextResponse.json({ error: 'Không tìm thấy item' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã xóa item' });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
