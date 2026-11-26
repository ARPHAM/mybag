import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Recipe from '@/models/Recipe';
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

    return NextResponse.json({ message: 'Đã tạo công thức mới!', recipe: newRecipe }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
