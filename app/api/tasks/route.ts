import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { verifyToken } from '@/lib/auth';
import { getRequestNow } from '@/lib/simClock';

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

    // Tối ưu read-path: chỉ ghi DB (updateMany) khi thực sự có task mới quá hạn
    const now = getRequestNow(req);
    const tasks = await Task.find({ user_id: decoded.userId }).sort({ createdAt: -1 });
    const newlyOverdueIds: any[] = [];
    for (const task of tasks) {
      if ((task.status === 'PENDING' || task.status === 'IN_PROGRESS') && task.due_date && new Date(task.due_date) < now) {
        task.status = 'OVERDUE';
        newlyOverdueIds.push(task._id);
      }
    }
    if (newlyOverdueIds.length > 0) {
      await Task.updateMany(
        { _id: { $in: newlyOverdueIds }, user_id: decoded.userId },
        { $set: { status: 'OVERDUE' } }
      );
    }

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

    const titleStr = typeof title === 'string' ? title.trim() : '';
    if (!titleStr || titleStr.length > 200) {
      return NextResponse.json({ error: 'Tiêu đề nhiệm vụ không hợp lệ (1-200 ký tự)' }, { status: 400 });
    }

    if (!due_date) {
      return NextResponse.json({ error: 'Vui lòng chọn hạn chót nhiệm vụ' }, { status: 400 });
    }

    const dueDateObj = new Date(due_date);
    if (isNaN(dueDateObj.getTime())) {
      return NextResponse.json({ error: 'Hạn chót không hợp lệ' }, { status: 400 });
    }

    const validRank = ['S', 'A', 'B', 'C', 'D'].includes(quest_rank) ? quest_rank : 'C';

    const newTask = await Task.create({
      user_id: decoded.userId,
      title: titleStr,
      description: typeof description === 'string' ? description.trim() : '',
      quest_rank: validRank,
      due_date: dueDateObj,
      status: 'PENDING',
    });

    return NextResponse.json({ message: 'Đã nhận Quest mới!', task: newTask }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
