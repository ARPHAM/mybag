import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
import Inventory from '@/models/Inventory';
import '@/models/Recipe'; // Tránh lỗi MissingSchemaError
import '@/models/User'; // Tránh lỗi MissingSchemaError cho User
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

    const meals = await MealLog.find({ user_id: decoded.userId }).populate('recipe_id').sort({ consumed_at: -1 });
    return NextResponse.json(meals, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30', // Cache 15s
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server Error', stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
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
    const { food_name, consumed_at, recipe_id, source, ingredients_used, cost, ingredients_text, wallet_id } = body;

    if (!food_name) {
      return NextResponse.json({ error: 'Thiếu tên món ăn' }, { status: 400 });
    }

    let calculatedCost = 0;
    let transaction_id = null;

    if (source === 'home' && ingredients_used && Array.isArray(ingredients_used)) {
      // Deduct inventory if any ingredients were used
      for (const ing of ingredients_used) {
        if (ing.invId && ing.qty > 0) {
          const item = await Inventory.findOne({ _id: ing.invId, user_id: decoded.userId });
          if (item) {
            // Deduct total value proportionally, rounding down
            if (item.totalValue && item.quantity > 0) {
              const valuePerUnit = item.totalValue / item.quantity;
              const valueToDeduct = Math.floor(valuePerUnit * ing.qty);
              item.totalValue = Math.max(0, item.totalValue - valueToDeduct);
              calculatedCost += valueToDeduct;
            }
            item.quantity = Math.max(0, item.quantity - ing.qty);
            await item.save();
          }
        }
      }
    } else if (source === 'eat_out' && cost > 0 && wallet_id) {
      const Wallet = (await import('@/models/Wallet')).default;
      const Transaction = (await import('@/models/Transaction')).default;
      
      const wallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId, balance: { $gte: cost } },
        { $inc: { balance: -cost } },
        { returnDocument: 'after' }
      );
      if (!wallet) {
        return NextResponse.json({ error: 'Số dư ví không đủ hoặc ví không tồn tại' }, { status: 400 });
      }
      
      const newTx = await Transaction.create({
        user_id: decoded.userId,
        type: 'expense',
        amount: cost,
        date: consumed_at ? new Date(consumed_at) : new Date(),
        description: `[Ăn ngoài] ${food_name}`,
        category: 'Thực phẩm',
        wallet_id: wallet._id,
        walletName: wallet.name
      });
      transaction_id = newTx._id;
    }

    // Determine random hp_restored and a default meal_tier based on random values for now
    const hp_restored = Math.floor(Math.random() * 101) + 200; // 200 - 300 HP
    const meal_tier = 'LIGHT';

    const newMealLog = await MealLog.create({
      user_id: decoded.userId,
      food_name,
      meal_tier,
      hp_restored,
      consumed_at: consumed_at ? new Date(consumed_at) : new Date(),
      ai_status: 'pending',
      recipe_id: recipe_id || null,
      source: source || 'home',
      ingredients_text: ingredients_text || undefined,
      cost: source === 'home' ? calculatedCost : (cost || 0),
      ingredients_used: source === 'home' ? ingredients_used : undefined,
      transaction_id: transaction_id,
      wallet_id: source === 'eat_out' ? wallet_id : undefined
    });

    // Cộng máu cho User
    const User = (await import('@/models/User')).default;
    const user = await User.findById(decoded.userId);
    if (user) {
      user.current_hp = Math.min(user.max_hp, user.current_hp + hp_restored);
      await user.save();
    }

    return NextResponse.json({ message: 'Đã lưu bữa ăn!', mealLog: newMealLog }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server Error', stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}
