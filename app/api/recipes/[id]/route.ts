import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Recipe from '@/models/Recipe';
import { verifyToken } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }
    const body = await req.json();
    const { name, ingredients, instructions } = body;

    const updateData: any = {};
    if (name !== undefined) {
      const nameStr = String(name).trim();
      if (!nameStr || nameStr.length > 200) {
        return NextResponse.json({ error: 'Tên công thức không hợp lệ (1-200 ký tự)' }, { status: 400 });
      }
      updateData.name = nameStr;
    }

    if (ingredients !== undefined) {
      updateData.ingredients = Array.isArray(ingredients) ? ingredients : [];
    }

    if (instructions !== undefined) {
      updateData.instructions = String(instructions).trim();
    }

    const updated = await Recipe.findOneAndUpdate(
      { _id: id, user_id: decoded.userId },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Không tìm thấy công thức' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã cập nhật công thức!', recipe: updated });
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

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }
    const deleted = await Recipe.findOneAndDelete({ _id: id, user_id: decoded.userId });

    if (!deleted) {
      return NextResponse.json({ error: 'Không tìm thấy công thức' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã xóa công thức thành công!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
