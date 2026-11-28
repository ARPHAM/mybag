import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import HealthAnalysis from '@/models/HealthAnalysis';
import MealLog from '@/models/MealLog';
import User from '@/models/User';
import WeightLog from '@/models/WeightLog';
import { verifyToken } from '@/lib/auth';
import { generateContentWithFallback } from '@/lib/ai';
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

    const now = getRequestNow(req);

    // Kiểm tra cooldown chỉ dựa trên lượt phân tích THÀNH CÔNG đã lưu trước đó (tránh chặn khi AI gặp sự cố/quá tải)
    const latestAnalysis = await HealthAnalysis.findOne({ user_id: decoded.userId }).sort({ analyzed_at: -1 });
    if (latestAnalysis && latestAnalysis.analyzed_at) {
      const elapsedMs = now.getTime() - new Date(latestAnalysis.analyzed_at).getTime();
      const COOLDOWN_MS = 10 * 60 * 1000; // 10 phút cooldown
      if (elapsedMs >= 0 && elapsedMs < COOLDOWN_MS) {
        const remainingMinutes = Math.ceil((COOLDOWN_MS - elapsedMs) / 60000);
        return NextResponse.json(
          { error: `Hệ thống vừa phân tích thành công. Vui lòng thử lại sau ${remainingMinutes} phút.` },
          { status: 429 }
        );
      }
    }

    const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayVnStr = vnDateFormatter.format(now);
    const todayStartVn = new Date(`${todayVnStr}T00:00:00+07:00`);
    const end_date = now;
    const start_date = new Date(todayStartVn.getTime() - 6 * 24 * 60 * 60 * 1000);

    const meals = await MealLog.find({
      user_id: decoded.userId,
      consumed_at: { $gte: start_date, $lte: end_date }
    }).sort({ consumed_at: 1 });

    if (meals.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu ăn uống trong 7 ngày qua để phân tích' }, { status: 400 });
    }

    // Prepare text for AI
    const startVnLabel = vnDateFormatter.format(start_date).split('-').reverse().join('/');
    const endVnLabel = todayVnStr.split('-').reverse().join('/');
    let historyText = `Lịch sử ăn uống 7 ngày qua (từ ${startVnLabel} đến ${endVnLabel}):\n`;
    let totalCalo = 0;
    const activeDays = new Set<string>();

    meals.forEach(meal => {
      const mealVnDate = vnDateFormatter.format(new Date(meal.consumed_at));
      activeDays.add(mealVnDate);
      const date = mealVnDate.split('-').reverse().join('/');
      historyText += `- ${date}: ${meal.food_name} (${meal.source === 'home' ? 'Nấu tại nhà' : 'Ăn ngoài'}). `;
      if (meal.ingredients_text) {
        historyText += `Nguyên liệu: ${meal.ingredients_text}. `;
      }
      if (meal.ai_description) {
        historyText += `Mô tả từ AI: ${meal.ai_description}. `;
      }
      historyText += `Macro: ${meal.calo} Kcal, ${meal.protein}g đạm, ${meal.fat}g béo, ${meal.carbs}g tinh bột, ${meal.sugar}g đường.\n`;
      totalCalo += meal.calo || 0;
    });

    const loggedDaysCount = Math.max(1, activeDays.size);
    const avgCalo = Math.round(totalCalo / loggedDaysCount);

    // Get User, BMI and Weight Trend info
    const user = await User.findById(decoded.userId);
    const recentWeights = await WeightLog.find({ user_id: decoded.userId, date: { $lte: end_date } })
      .sort({ date: -1 })
      .limit(2);
    const latestWeight = recentWeights[0] || null;
    const prevWeight = recentWeights[1] || null;
    let bodyStatsStr = "Thông tin thể trạng: Chưa rõ (Khuyên người dùng cập nhật trên ứng dụng).";
    if (user && latestWeight && user.height > 0) {
      const heightInM = user.height / 100;
      const bmi = (latestWeight.weight / (heightInM * heightInM)).toFixed(1);
      const trendPart = prevWeight
        ? `, Biến động cân gần nhất: ${(latestWeight.weight - prevWeight.weight) >= 0 ? '+' : ''}${(latestWeight.weight - prevWeight.weight).toFixed(1)}kg (từ ${prevWeight.weight}kg)`
        : '';
      bodyStatsStr = `Thông tin thể trạng: Cao ${user.height}cm, Nặng ${latestWeight.weight}kg, BMI = ${bmi}${trendPart}.`;
    }

    const prompt = `Bạn là một chuyên gia dinh dưỡng và sức khỏe cá nhân nghiêm khắc nhưng tận tâm.
Dưới đây là lịch sử ăn uống chi tiết trong 7 ngày gần nhất (${loggedDaysCount} ngày có ghi nhận bữa ăn) của người dùng:

${bodyStatsStr}

${historyText}
(Lượng calo trung bình trên ${loggedDaysCount} ngày có ghi nhận: ${avgCalo} Kcal/ngày)

Dựa vào danh sách trên, hãy phân tích sức khỏe và thói quen ăn uống của người dùng trong tuần qua.
Yêu cầu nội dung phản hồi:
1. Nhận xét tổng quan về lượng calo, tỷ lệ các chất (đạm, béo, tinh bột, đường) và đối chiếu với BMI/xu hướng cân nặng.
2. Nhận xét về các nguyên liệu thực tế người dùng đã tiêu thụ (ví dụ: ăn nhiều đồ chiên rán, ăn nhiều rau hay thiếu rau, thịt đỏ...).
3. Đưa ra 3 lời khuyên thiết thực, cụ thể để cải thiện trong tuần tới.

Trả về phản hồi bằng định dạng Markdown, sử dụng tiếng Việt thân thiện, rõ ràng, chia đoạn dễ đọc. Đừng dùng tiêu đề quá lớn.`;

    const text = await generateContentWithFallback(prompt);

    const newAnalysis = await HealthAnalysis.create({
      user_id: decoded.userId,
      analysis_text: text,
      analyzed_at: now,
      start_date,
      end_date
    });

    return NextResponse.json(newAnalysis, { status: 201 });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
