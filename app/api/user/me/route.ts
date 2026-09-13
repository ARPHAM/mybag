import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const user = await User.findById(decoded.userId).select('-password_hash');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const now = new Date();
    
    // 1. Tính toán HP/MP theo thời gian
    // Nếu last_hp_mp_update chưa có (tài khoản cũ), khởi tạo bằng last_active_at hoặc now
    const lastUpdate = user.last_hp_mp_update || user.last_active_at || now;
    const hoursPassed = (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);

    if (hoursPassed > 0) {
      // HP tụt 50 mỗi giờ
      const hpLoss = hoursPassed * 50;
      user.current_hp = Math.max(0, user.current_hp - hpLoss);
    }

    // 2. Tìm và phạt các Task quá hạn
    const Task = (await import('@/models/Task')).default;
    const overdueTasks = await Task.find({
      user_id: user._id,
      status: { $ne: 'COMPLETED' },
      due_date: { $lt: now },
      mp_penalty_applied: false
    });

    if (overdueTasks.length > 0) {
      for (const task of overdueTasks) {
        user.current_mp = Math.max(0, user.current_mp - 100); // Trừ 100 MP mỗi task
        task.status = 'OVERDUE';
        task.mp_penalty_applied = true;
        await task.save();
      }
    }

    // 3. Cập nhật thời gian
    user.last_hp_mp_update = now;
    user.last_active_at = now;
    await user.save();

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
