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

    const item = await ShoppingItem.findOneAndUpdate(
      { _id: id, user_id: decoded.userId },
      { $set: body },
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
