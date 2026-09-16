import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Wallet from '@/models/Wallet';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { name, type, balance, color } = body;

    const wallet = await Wallet.findOne({ _id: id, user_id: decoded.userId });
    if (!wallet) {
      return NextResponse.json({ error: 'Không tìm thấy ví' }, { status: 404 });
    }

    if (name) wallet.name = name;
    if (type) wallet.type = type;
    if (balance !== undefined) {
      if (balance < 0) return NextResponse.json({ error: 'Số dư không được âm' }, { status: 400 });
      wallet.balance = balance;
    }
    if (color) wallet.color = color;

    await wallet.save();

    return NextResponse.json(wallet, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const wallet = await Wallet.findOneAndDelete({ _id: id, user_id: decoded.userId });
    if (!wallet) {
      return NextResponse.json({ error: 'Không tìm thấy ví' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Xóa ví thành công' }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
