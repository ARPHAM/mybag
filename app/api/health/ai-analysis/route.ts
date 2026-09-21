import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import HealthAnalysis from '@/models/HealthAnalysis';
import MealLog from '@/models/MealLog';
import User from '@/models/User';
import WeightLog from '@/models/WeightLog';
import { verifyToken } from '@/lib/auth';
import { generateContentWithFallback } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const latest = await HealthAnalysis.findOne({ user_id: decoded.userId }).sort({ analyzed_at: -1 });
    return NextResponse.json(latest || null, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120', // Cache 1 phút
      }
    });
  } catch (error) {
    console.error(error);
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

    const end_date = new Date();
    const start_date = new Date();
    start_date.setDate(start_date.getDate() - 7);
    start_date.setHours(0, 0, 0, 0);

    const meals = await MealLog.find({
      user_id: decoded.userId,
      consumed_at: { $gte: start_date }
    }).sort({ consumed_at: 1 });

    if (meals.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu ăn uống trong 7 ngày qua để phân tích' }, { status: 400 });
    }

    // Prepare text for AI
    let historyText = `Lịch sử ăn uống 7 ngày qua (từ ${start_date.toLocaleDateString('vi-VN')} đến nay):\n`;
    let totalCalo = 0;

    meals.forEach(meal => {
      const date = new Date(meal.consumed_at).toLocaleDateString('vi-VN');
      historyText += `- ${date}: ${meal.food_name} (${meal.source === 'home' ? 'Nấu tại nhà' : 'Ăn ngoài'}). `;
      if (meal.ingredients_text) {
        historyText += `Nguyên liệu: ${meal.ingredients_text}. `;
      }
      historyText += `Marco: ${meal.calo} Kcal, ${meal.protein}g đạm, ${meal.fat}g béo, ${meal.carbs}g tinh bột, ${meal.sugar}g đường.\n`;
      totalCalo += meal.calo || 0;
    });

    const avgCalo = Math.round(totalCalo / 7);

    // Get User and BMI info
    const user = await User.findById(decoded.userId);
    const latestWeight = await WeightLog.findOne({ user_id: decoded.userId }).sort({ date: -1 });
    let bodyStatsStr = "Thông tin thể trạng: Chưa rõ (Khuyên người dùng cập nhật trên ứng dụng).";
    if (user && latestWeight) {
      const heightInM = user.height / 100;
      const bmi = (latestWeight.weight / (heightInM * heightInM)).toFixed(1);
      bodyStatsStr = `Thông tin thể trạng: Cao ${user.height}cm, Nặng ${latestWeight.weight}kg, BMI = ${bmi}.`;
    }

    const prompt = `Bạn là một chuyên gia dinh dưỡng và sức khỏe cá nhân nghiêm khắc nhưng tận tâm.
Dưới đây là lịch sử ăn uống chi tiết trong 7 ngày gần nhất của người dùng:

${bodyStatsStr}

${historyText}
(Lượng calo trung bình: ${avgCalo} Kcal/ngày)

Dựa vào danh sách trên, hãy phân tích sức khỏe và thói quen ăn uống của người dùng trong tuần qua.
Yêu cầu nội dung phản hồi:
1. Nhận xét tổng quan về lượng calo và tỷ lệ các chất (đạm, béo, tinh bột, đường).
2. Nhận xét về các nguyên liệu thực tế người dùng đã tiêu thụ (ví dụ: ăn nhiều đồ chiên rán, ăn nhiều rau hay thiếu rau, thịt đỏ...).
3. Đưa ra 3 lời khuyên thiết thực, cụ thể để cải thiện trong tuần tới.

Trả về phản hồi bằng định dạng Markdown, sử dụng tiếng Việt thân thiện, rõ ràng, chia đoạn dễ đọc. Đừng dùng tiêu đề quá lớn.`;

    const text = await generateContentWithFallback(prompt);

    const newAnalysis = await HealthAnalysis.create({
      user_id: decoded.userId,
      analysis_text: text,
      analyzed_at: new Date(),
      start_date,
      end_date
    });

    return NextResponse.json(newAnalysis, { status: 201 });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
