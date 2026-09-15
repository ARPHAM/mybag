import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
    
    // 1. Chuyển các task quá hạn thành OVERDUE
    const Task = (await import('@/models/Task')).default;
    await Task.updateMany({
      user_id: user._id,
      status: 'PENDING',
      due_date: { $lt: now }
    }, {
      $set: { status: 'OVERDUE' }
    });

    // 2. Tính toán số lượng task đang OVERDUE
    const overdueCount = await Task.countDocuments({
      user_id: user._id,
      status: 'OVERDUE'
    });

    // 3. Tính toán HP/MP theo thời gian
    // Nếu last_hp_mp_update chưa có (tài khoản cũ), khởi tạo bằng last_active_at hoặc now
    const lastUpdate = user.last_hp_mp_update || user.last_active_at || now;
    const hoursPassed = (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);

    if (hoursPassed > 0) {
      // HP tụt 50 mỗi giờ
      const hpLoss = hoursPassed * 50;
      user.current_hp = Math.max(0, user.current_hp - hpLoss);

      // MP Drain or Regen
      if (overdueCount > 0) {
        // Drain 20 MP / hour for each overdue task
        const mpLoss = hoursPassed * 20 * overdueCount;
        user.current_mp = Math.max(0, user.current_mp - mpLoss);
      } else {
        // Regen 30 MP / hour if no overdue tasks
        const mpRegen = hoursPassed * 30;
        user.current_mp = Math.min(user.max_mp, user.current_mp + mpRegen);
      }
    }

    // 4. Cập nhật thời gian
    user.last_hp_mp_update = now;
    user.last_active_at = now;
    await user.save();

    return NextResponse.json({ user, overdueCount }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
