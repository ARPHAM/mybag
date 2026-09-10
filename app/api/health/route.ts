import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import WeightLog from '@/models/WeightLog';
import { verifyToken } from '@/lib/auth';

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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const logs = await WeightLog.find({ 
      user_id: decoded.userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    // Map dữ liệu format để biểu đồ Recharts dễ đọc
    const history = logs.map(log => ({
      date: new Date(log.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      weight: log.weight,
    }));

    return NextResponse.json({ height: user.height, history });
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

    let rewardExp = 0;
    let message = 'Đã cập nhật chỉ số sức khoẻ!';
    
    // Cập nhật chiều cao nếu có thay đổi
    if (height && height !== user.height) {
      user.height = height;
    }

    // Ghi nhận cân nặng
    if (weight) {
      const recordDate = date ? new Date(date) : new Date();
      // Xoá log cũ cùng ngày để tránh trùng lặp
      const startOfDay = new Date(recordDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(recordDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      await WeightLog.findOneAndDelete({ 
        user_id: decoded.userId, 
        date: { $gte: startOfDay, $lte: endOfDay } 
      });

      await WeightLog.create({
        user_id: decoded.userId,
        weight,
        date: recordDate,
      });

      // Gamification Logic: BMI 
      const heightInM = user.height / 100;
      const bmi = weight / (heightInM * heightInM);
      const isNormalBmi = bmi >= 18.5 && bmi <= 24.9;

      // Cộng EXP (giả lập một xíu EXP động viên)
      rewardExp = 100;
      user.current_exp += rewardExp;

      // Level up logic (đơn giản hoá, bạn có thể tái sử dụng hàm từ tasks nếu muốn)
      let leveledUp = false;
      const getExpForNextLevel = (level: number) => level * 500;
      let requiredExp = getExpForNextLevel(user.level);
      while (user.current_exp >= requiredExp) {
        user.current_exp -= requiredExp;
        user.level += 1;
        user.max_hp += 50; 
        user.max_mp += 20;
        leveledUp = true;
        requiredExp = getExpForNextLevel(user.level);
      }

      if (isNormalBmi) {
        message = 'Tỉ lệ cơ thể hoàn hảo! Bạn được thưởng HP Vĩnh Viễn!';
        user.max_hp += 100; // Buff vĩnh viễn
        user.current_hp = user.max_hp;
      }
    }

    await user.save();

    return NextResponse.json({ message, rewardExp });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
