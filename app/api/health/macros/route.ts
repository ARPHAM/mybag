import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const meals = await MealLog.find({
      user_id: decoded.userId,
      consumed_at: { $gte: sevenDaysAgo }
    }).sort({ consumed_at: 1 });

    // Aggregate by date (YYYY-MM-DD)
    const aggregated: Record<string, any> = {};

    // Khởi tạo 7 ngày gần nhất để biểu đồ không bị trống ngày
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      aggregated[dateStr] = {
        date: dateStr,
        calo: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        sugar: 0
      };
    }

    meals.forEach(meal => {
      const dateStr = new Date(meal.consumed_at).toISOString().split('T')[0];
      if (aggregated[dateStr]) {
        aggregated[dateStr].calo += meal.calo || 0;
        aggregated[dateStr].protein += meal.protein || 0;
        aggregated[dateStr].fat += meal.fat || 0;
        aggregated[dateStr].carbs += meal.carbs || 0;
        aggregated[dateStr].sugar += meal.sugar || 0;
      }
    });

    const result = Object.values(aggregated).map(item => ({
      ...item,
      calo: Math.round(item.calo),
      protein: Math.round(item.protein),
      fat: Math.round(item.fat),
      carbs: Math.round(item.carbs),
      sugar: Math.round(item.sugar),
    }));

    return NextResponse.json(result, { 
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
