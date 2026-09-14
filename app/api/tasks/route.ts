import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { verifyToken } from '@/lib/auth';

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

    const user = await import('@/models/User').then(m => m.default).then(User => User.findById(decoded.userId));
    
    // Auto-fail overdue tasks
    const now = new Date();
    await Task.updateMany({
      user_id: decoded.userId,
      status: 'PENDING',
      due_date: { $lt: now }
    }, {
      $set: { status: 'OVERDUE' }
    });

    const tasks = await Task.find({ user_id: decoded.userId }).sort({ createdAt: -1 });
    return NextResponse.json(tasks, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
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
    const { title, description, quest_rank, due_date } = body;

    if (!title || !due_date) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const newTask = await Task.create({
      user_id: decoded.userId,
      title,
      description,
      quest_rank: quest_rank || 'C',
      due_date: new Date(due_date),
      status: 'PENDING',
    });

    return NextResponse.json({ message: 'Đã nhận Quest mới!', task: newTask }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
