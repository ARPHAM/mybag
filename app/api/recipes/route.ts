import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Recipe from '@/models/Recipe';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { calculateLevelProgression } from '@/lib/gameLevel';
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

    const recipes = await Recipe.find({ user_id: decoded.userId }).sort({ created_at: -1 });
    return NextResponse.json(recipes, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600', // Cache 5 phút
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

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    const body = await req.json();
    const { name, ingredients, instructions } = body;

    const nameStr = typeof name === 'string' ? name.trim() : '';
    if (!nameStr || nameStr.length > 200) {
      return NextResponse.json({ error: 'Tên công thức không hợp lệ (1-200 ký tự)' }, { status: 400 });
    }

    const newRecipe = await Recipe.create({
      user_id: decoded.userId,
      name: nameStr,
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      instructions: typeof instructions === 'string' ? instructions.trim() : undefined,
    });

    // Thưởng +50 EXP khi tạo công thức mới (tôn trọng giới hạn EXP ngày)
    let rewardExp = 0;
    const user = await User.findById(decoded.userId);
    if (user) {
      const vnDate = new Date(getRequestNow(req).getTime() + 7 * 60 * 60 * 1000);
      const todayKey = `${vnDate.getUTCFullYear()}-${String(vnDate.getUTCMonth() + 1).padStart(2, '0')}-${String(vnDate.getUTCDate()).padStart(2, '0')}`;
      if (user.last_task_exp_date !== todayKey) {
        user.last_task_exp_date = todayKey;
        user.today_task_exp = 0;
      }
      const available = Math.max(0, 3000 - (user.today_task_exp || 0));
      rewardExp = Math.min(50, available);
      if (rewardExp > 0) {
        const prog = calculateLevelProgression((user.current_exp || 0) + rewardExp, user.level || 1);
        user.level = prog.level;
        user.current_exp = prog.currentExp;
        user.today_task_exp = (user.today_task_exp || 0) + rewardExp;
        await user.save();
      }
    }

    return NextResponse.json({ message: 'Đã tạo công thức mới!', recipe: newRecipe, rewardExp }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
