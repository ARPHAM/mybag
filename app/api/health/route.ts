import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import WeightLog from '@/models/WeightLog';
import { verifyToken } from '@/lib/auth';
import { getVnDateStr, parseVnDateTime } from '@/lib/vnTime';
import { calculateLevelProgression } from '@/lib/gameLevel';
import { getRequestNow } from '@/lib/simClock';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Lấy log cân nặng, giới hạn 30 ngày gần nhất, sắp xếp tăng dần theo thời gian (cũ -> mới)
    const now = getRequestNow(req);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const logs = await WeightLog.find({ 
      user_id: decoded.userId,
      date: { $gte: thirtyDaysAgo, $lte: now }
    }).sort({ date: 1 });

    // Map dữ liệu format để biểu đồ Recharts dễ đọc
    const history = logs.map(log => ({
      dateLabel: new Date(log.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }),
      date: new Date(log.date).toISOString(), // Giữ nguyên ISO string để frontend tính toán date math
      weight: log.weight,
    }));

    return NextResponse.json({ height: user.height, history }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120', // Cache 1 phút
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

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { weight, height, date } = body;

    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Validate và cập nhật chiều cao nếu có thay đổi
    if (height !== undefined && height !== null && height !== '') {
      const h = Number(height);
      if (isNaN(h) || h < 50 || h > 250) {
        return NextResponse.json({ error: 'Chiều cao không hợp lệ (50 - 250 cm)' }, { status: 400 });
      }
      user.height = Math.round(h);
    }

    // Validate và ghi nhận cân nặng
    let rewardExp = 0;
    let leveledUp = false;
    if (weight !== undefined && weight !== null && weight !== '') {
      const w = Number(weight);
      if (isNaN(w) || w < 20 || w > 300) {
        return NextResponse.json({ error: 'Cân nặng không hợp lệ (20 - 300 kg)' }, { status: 400 });
      }

      const now = getRequestNow(req);
      const recordDate = date ? (parseVnDateTime(date, '12:00:00') ?? now) : now;
      // Xoá log cũ cùng ngày theo múi giờ Việt Nam để tránh trùng lặp
      const vnDateKey = getVnDateStr(recordDate);
      const startOfDay = new Date(`${vnDateKey}T00:00:00+07:00`);
      const endOfDay = new Date(`${vnDateKey}T23:59:59.999+07:00`);

      const existingSameDay = await WeightLog.findOneAndDelete({ 
        user_id: decoded.userId, 
        date: { $gte: startOfDay, $lte: endOfDay } 
      });

      await WeightLog.create({
        user_id: decoded.userId,
        weight: Number(w.toFixed(1)),
        date: recordDate,
      });

      // Chỉ thưởng +20 EXP cho lần ghi cân nặng đầu tiên của ngày đó (chống farm)
      if (!existingSameDay) {
        rewardExp = 20;
        const prog = calculateLevelProgression((user.current_exp || 0) + rewardExp, user.level || 1);
        user.level = prog.level;
        user.current_exp = prog.currentExp;
        leveledUp = prog.leveledUp;
      }
    }

    await user.save();

    return NextResponse.json({
      message: 'Đã cập nhật chỉ số sức khoẻ!',
      ...(rewardExp > 0 ? { rewardExp, leveledUp, newLevel: user.level } : {})
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
