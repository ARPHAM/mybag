import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
import Inventory from '@/models/Inventory';
import '@/models/Recipe'; // Tránh lỗi MissingSchemaError
import '@/models/User'; // Tránh lỗi MissingSchemaError cho User
import { verifyToken } from '@/lib/auth';

function getTodayVnDateStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function resolveConsumedAtDate(consumed_at?: string): Date {
  if (!consumed_at) return new Date();
  const trimmed = String(consumed_at).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const todayVn = getTodayVnDateStr();
    if (trimmed === todayVn) {
      return new Date();
    }
    return new Date(`${trimmed}T12:00:00+07:00`);
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function cleanManualIngredientsNote(raw?: string): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  let cleaned = raw.trim();
  if (!cleaned) return undefined;
  if (cleaned.includes('. Bổ sung: ')) {
    const parts = cleaned.split('. Bổ sung: ');
    cleaned = parts[parts.length - 1].trim();
  }
  return cleaned || undefined;
}

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
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
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
    const { food_name, consumed_at, recipe_id, source, ingredients_used, cost, ingredients_text, wallet_id, image_url } = body;

    if (!food_name) {
      return NextResponse.json({ error: 'Thiếu tên món ăn' }, { status: 400 });
    }

    const resolvedDate = resolveConsumedAtDate(consumed_at);
    let calculatedCost = 0;
    let transaction_id: any = undefined;
    const processedIngredientsUsed: {
      invId: string;
      qty: number;
      cost: number;
      name: string;
      unit: string;
    }[] = [];

    if (source === 'home' && ingredients_used && Array.isArray(ingredients_used)) {
      // Gộp các dòng trùng invId và lọc qty > 0
      const mergedMap = new Map<string, number>();
      for (const ing of ingredients_used) {
        const qtyNum = Number(ing?.qty);
        if (ing?.invId && !isNaN(qtyNum) && qtyNum > 0) {
          mergedMap.set(ing.invId, Number(((mergedMap.get(ing.invId) || 0) + qtyNum).toFixed(4)));
        }
      }

      // Bước 1: Kiểm tra tồn kho hợp lệ trước khi trừ
      const itemsToDeduct: { item: any; qty: number }[] = [];
      for (const [invId, qty] of mergedMap.entries()) {
        const item = await Inventory.findOne({ _id: invId, user_id: decoded.userId });
        if (!item) {
          return NextResponse.json({ error: 'Một nguyên liệu được chọn không còn tồn tại trong kho' }, { status: 400 });
        }
        if (item.quantity <= 0) {
          return NextResponse.json({ error: `Nguyên liệu "${item.name}" trong kho đã dùng hết!` }, { status: 400 });
        }
        if (qty > item.quantity + 1e-6) {
          return NextResponse.json(
            { error: `Nguyên liệu "${item.name}" trong kho chỉ còn ${item.quantity} ${item.unit} (không đủ ${qty} ${item.unit})` },
            { status: 400 }
          );
        }
        itemsToDeduct.push({ item, qty: Math.min(item.quantity, qty) });
      }

      // Bước 2: Khấu trừ số lượng và giá trị kho chính xác
      for (const { item, qty } of itemsToDeduct) {
        if (!item.originalValue && item.totalValue && item.totalValue > 0 && item.quantity === item.originalQuantity) {
          item.originalValue = item.totalValue;
        }

        let valueToDeduct = 0;
        if (item.totalValue && item.totalValue > 0 && item.quantity > 0) {
          if (qty >= item.quantity - 1e-6) {
            // Dùng hết sạch phần còn lại -> khấu trừ toàn bộ giá trị còn lại (tránh sai số làm tròn)
            valueToDeduct = Math.round(item.totalValue);
          } else {
            const valuePerUnit = item.totalValue / item.quantity;
            valueToDeduct = Math.min(Math.round(item.totalValue), Math.round(valuePerUnit * qty));
          }
          item.totalValue = Math.max(0, Math.round(item.totalValue - valueToDeduct));
          calculatedCost += valueToDeduct;
        }

        item.quantity = Math.max(0, Number((item.quantity - qty).toFixed(4)));
        await item.save();

        processedIngredientsUsed.push({
          invId: item._id.toString(),
          qty,
          cost: valueToDeduct,
          name: item.name,
          unit: item.unit
        });
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
        date: resolvedDate,
        description: `[Ăn ngoài] ${food_name}`,
        category: 'food',
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
      consumed_at: resolvedDate,
      ai_status: 'pending',
      recipe_id: recipe_id || undefined,
      source: source || 'home',
      ingredients_text: cleanManualIngredientsNote(ingredients_text),
      image_url: image_url || undefined,
      cost: source === 'home' ? calculatedCost : (Number(cost) || 0),
      ingredients_used: source === 'home' ? processedIngredientsUsed : undefined,
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
