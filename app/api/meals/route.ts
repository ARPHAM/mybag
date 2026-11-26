import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
import Inventory from '@/models/Inventory';
import '@/models/Recipe'; // Tránh lỗi MissingSchemaError
import '@/models/User'; // Tránh lỗi MissingSchemaError cho User
import { verifyToken } from '@/lib/auth';
import { convertQtyToInventoryUnit } from '@/lib/unitHelper';

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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const daysParam = searchParams.get('days');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = { user_id: decoded.userId };

    // Tìm kiếm từ khóa theo tên món, nguyên liệu, ghi chú AI, hoặc ghi chú chỉnh sửa
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { food_name: { $regex: searchRegex } },
        { ingredients_text: { $regex: searchRegex } },
        { ai_description: { $regex: searchRegex } },
        { edit_note: { $regex: searchRegex } },
        { 'ingredients_used.name': { $regex: searchRegex } }
      ];
    }

    // Lọc theo khoảng ngày hoặc số ngày (Mặc định 7 ngày gần nhất để tối ưu query)
    if (startDate || endDate) {
      const dateCond: any = {};
      if (startDate) {
        dateCond.$gte = new Date(`${startDate}T00:00:00+07:00`);
      }
      if (endDate) {
        dateCond.$lte = new Date(`${endDate}T23:59:59.999+07:00`);
      }
      query.consumed_at = dateCond;
    } else if (daysParam !== 'all') {
      const numDays = daysParam ? parseInt(daysParam, 10) : 7;
      const validDays = isNaN(numDays) || numDays <= 0 ? 7 : numDays;

      // Tính mốc 00:00:00 của (validDays - 1) ngày trước theo giờ Việt Nam (UTC+7)
      const now = new Date();
      const vnDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now);
      const [y, m, d] = vnDateStr.split('-').map(Number);
      const startVn = new Date(Date.UTC(y, m - 1, d - (validDays - 1), -7, 0, 0, 0));
      query.consumed_at = { $gte: startVn };
    }

    const meals = await MealLog.find(query).populate('recipe_id').sort({ consumed_at: -1 });
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
    const {
      food_name,
      consumed_at,
      recipe_id,
      source,
      ingredients_used,
      cost,
      ingredients_text,
      wallet_id,
      image_url,
      calo,
      protein,
      fat,
      carb,
      meal_tier: inputMealTier,
      hp_restored: inputHp,
      ai_description
    } = body;

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
      // Gộp các dòng trùng invId và lọc qty > 0 (kèm quy đổi đơn vị g <-> kg, ml <-> l về đúng đơn vị gốc của Kho)
      const rawByInvId = new Map<string, { qty: number; unit?: string }[]>();
      for (const ing of ingredients_used) {
        const qtyNum = Number(ing?.qty);
        if (ing?.invId && !isNaN(qtyNum) && qtyNum > 0) {
          const list = rawByInvId.get(ing.invId) || [];
          list.push({ qty: qtyNum, unit: ing.unit });
          rawByInvId.set(ing.invId, list);
        }
      }

      // Bước 1: Kiểm tra tồn kho hợp lệ trước khi trừ
      const itemsToDeduct: { item: any; qty: number }[] = [];
      for (const [invId, rawList] of rawByInvId.entries()) {
        const item = await Inventory.findOne({ _id: invId, user_id: decoded.userId });
        if (!item) {
          return NextResponse.json({ error: 'Một nguyên liệu được chọn không còn tồn tại trong kho' }, { status: 400 });
        }
        if (item.quantity <= 0) {
          return NextResponse.json({ error: `Nguyên liệu "${item.name}" trong kho đã dùng hết!` }, { status: 400 });
        }
        let qty = 0;
        for (const r of rawList) {
          qty += convertQtyToInventoryUnit(r.qty, r.unit, item.unit, item.quantity);
        }
        qty = Number(qty.toFixed(4));
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

        // Determine hp_restored and meal_tier
        const numCalo = Number(calo) || 0;
        const numProtein = Number(protein) || 0;
        const numFat = Number(fat) || 0;
        const numCarb = Number(carb) || 0;
        const cleanAiDesc = typeof ai_description === 'string' ? ai_description.trim() : undefined;
        const hp_restored = Number(inputHp) || (numCalo > 0 ? Math.floor(numCalo * 1.0) : Math.floor(Math.random() * 101) + 200);
        const meal_tier = ['HEAVY', 'LIGHT', 'DRINK'].includes(inputMealTier) ? inputMealTier : 'LIGHT';
        const ai_status = numCalo > 0 ? 'completed' : 'pending';

        const newMealLog = await MealLog.create({
          user_id: decoded.userId,
          food_name,
          meal_tier,
          hp_restored,
          consumed_at: resolvedDate,
          ai_status,
          recipe_id: recipe_id || undefined,
          source: source || 'home',
          ingredients_text: cleanManualIngredientsNote(ingredients_text),
          image_url: image_url || undefined,
          cost: source === 'home' ? calculatedCost : (Number(cost) || 0),
          ingredients_used: source === 'home' ? processedIngredientsUsed : undefined,
          transaction_id: transaction_id,
          wallet_id: source === 'eat_out' ? wallet_id : undefined,
          calo: numCalo,
          protein: numProtein,
          fat: numFat,
          carbs: numCarb,
          ai_description: cleanAiDesc
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
