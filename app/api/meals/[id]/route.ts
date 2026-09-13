import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
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

    const { id } = await params;
    const body = await req.json();

    const updatedMealLog = await MealLog.findOneAndUpdate(
      { _id: id, user_id: decoded.userId },
      { $set: body },
      { new: true }
    );

    if (!updatedMealLog) {
      return NextResponse.json({ error: 'Không tìm thấy bữa ăn' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã cập nhật', mealLog: updatedMealLog }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const deletedMeal = await MealLog.findOneAndDelete({ _id: id, user_id: decoded.userId });

    if (!deletedMeal) {
      return NextResponse.json({ error: 'Không tìm thấy bữa ăn' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã xóa bữa ăn' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
