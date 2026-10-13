import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import Debt from '@/models/Debt';
import MealLog from '@/models/MealLog';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { generateContentWithFallback } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp nội dung cần phân tích' }, { status: 400 });
    }

    // 1. Fetch user wallets for context matching
    const wallets = await Wallet.find({ user_id: decoded.userId });
    const walletListContext = wallets.map(w => ({
      id: w._id.toString(),
      name: w.name,
      type: w.type,
      balance: w.balance
    }));

    // 2. Build prompt for Gemini AI
    const prompt = `Bạn là một trợ lý tài chính thông minh của hệ thống MyBag (SAO Life System).
Người dùng nhập một câu văn tự nhiên ghi lại chi tiêu, thu nhập hoặc cho vay/nợ.

Danh sách ví hiện có của người dùng:
${JSON.stringify(walletListContext, null, 2)}

Câu người dùng nhập:
"${text}"

Nhiệm vụ của bạn:
1. Xác định ví nguồn mà người dùng muốn sử dụng (so khớp tên viết tắt hoặc tên gần đúng như "mb" -> "MB Bank", "momo" -> "Ví Momo", "tiền mặt" -> "Tiền mặt"). Nếu người dùng không nói rõ, hãy chọn ví có số dư cao nhất hoặc ví phổ biến nhất trong danh sách.
2. Bóc tách các hành động riêng biệt (Chi tiêu, Thu nhập, hoặc Ghi nợ/Cho vay).
   Ví dụ: "trả 80k bằng mb, trong đó 40k tôi ăn bún đậu mắm tôm, còn 40k trả hộ anh Tiệp":
   - Hành động 1: Chi tiêu ăn uống 40.000đ (danh mục food).
   - Hành động 2: Cho vay / Trả hộ anh Tiệp 40.000đ (loại nợ: lent, người: Anh Tiệp).
   - Cả 2 đều trừ từ ví MB Bank tương ứng.
3. Nếu là món ăn/đồ uống người dùng TỰ ĂN (VD "ăn phở bò 50k", "uống trà sữa 30k"), dùng actionType "meal" (KHÔNG dùng expense) và ước tính dinh dưỡng của 1 suất tiêu chuẩn. Hệ thống sẽ tự tạo cả lịch sử ăn uống lẫn chi tiêu. Món ăn được người khác đãi/miễn phí thì amount = 0 và vẫn dùng "meal".

Danh mục chi tiêu hợp lệ (category):
- "food" (Ăn uống)
- "housing" (Nhà cửa & Sinh hoạt)
- "transport" (Đi lại)
- "entertainment" (Giải trí)
- "shopping" (Mua sắm)
- "health" (Sức khoẻ)
- "other" (Khác)

Yêu cầu trả về DUY NHẤT một chuỗi JSON hợp lệ với cấu trúc sau, KHÔNG kèm giải thích thêm ngoài JSON:
{
  "summary": "Tóm tắt ngắn gọn các hành động",
  "matched_wallet": {
    "id": "ID của ví khớp từ danh sách trên",
    "name": "Tên ví khớp"
  },
  "actions": [
    {
      "actionType": "expense" | "income" | "debt_lent" | "debt_borrowed" | "meal",
      "food_name": "Tên món (chỉ cho meal)",
      "meal_tier": "HEAVY" | "LIGHT" | "DRINK" (chỉ cho meal),
      "calo": number, "protein": number, "fat": number, "carbs": number, "sugar": number (chỉ cho meal, đơn vị gram/kcal),
      "amount": number (số tiền VND, vd 40000),
      "category": "food" | "housing" | "transport" | "entertainment" | "shopping" | "health" | "other" (chỉ cần cho expense/income),
      "description": "Mô tả hành động",
      "person": "Tên người liên quan nếu là debt_lent hoặc debt_borrowed",
      "wallet_id": "ID ví",
      "walletName": "Tên ví"
    }
  ]
}`;

    const aiResponse = await generateContentWithFallback(prompt, undefined, true);
    let parsedData: any;
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("JSON parse error from AI:", aiResponse);
      return NextResponse.json({ error: 'AI không thể định dạng dữ liệu, vui lòng thử lại' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: parsedData
    });
  } catch (error: any) {
    console.error("POST /api/ai/smart-expense error:", error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý AI' }, { status: 500 });
  }
}

// Execute parsed actions
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { actions } = body;

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: 'Danh sách hành động không hợp lệ' }, { status: 400 });
    }

    const executedResults: any[] = [];
    const now = new Date();

    for (const action of actions) {
      const amount = Number(action.amount) || 0;

      if (action.actionType === 'meal') {
        let txId: any = undefined;
        if (amount > 0) {
          if (action.wallet_id) {
            await Wallet.findOneAndUpdate(
              { _id: action.wallet_id, user_id: decoded.userId },
              { $inc: { balance: -amount } }
            );
          }
          const tx = await Transaction.create({
            user_id: decoded.userId,
            type: 'expense',
            amount,
            date: now,
            description: `Ăn uống: ${action.food_name || action.description}`,
            category: 'food',
            wallet_id: action.wallet_id || undefined,
            walletName: action.walletName || 'Ví không xác định'
          });
          txId = tx._id;
        }

        const calo = Math.max(0, Number(action.calo) || 0);
        const hp = Math.floor(calo * 1.0); // 1 Calo = 1 HP (đồng bộ với calculate-macros)
        const tier = ['HEAVY', 'LIGHT', 'DRINK'].includes(action.meal_tier) ? action.meal_tier : 'LIGHT';

        const meal = await MealLog.create({
          user_id: decoded.userId,
          food_name: action.food_name || action.description || 'Bữa ăn',
          meal_tier: tier,
          hp_restored: hp,
          consumed_at: now,
          calo,
          protein: Number(action.protein) || 0,
          fat: Number(action.fat) || 0,
          carbs: Number(action.carbs) || 0,
          sugar: Number(action.sugar) || 0,
          cost: amount,
          ai_status: 'completed',
          ai_description: 'Ghi nhận bởi Yui',
          source: 'eat_out',
          transaction_id: txId,
          wallet_id: amount > 0 ? action.wallet_id : undefined
        });

        const user = await User.findById(decoded.userId);
        if (user) {
          user.current_hp = Math.min(user.max_hp, user.current_hp + hp);
          await user.save();
        }
        executedResults.push({ type: 'meal', id: meal._id, amount, hp });
        continue;
      }

      if (!amount || amount <= 0) continue;

      if (action.actionType === 'expense') {
        // 1. Trừ tiền ví
        if (action.wallet_id) {
          await Wallet.findOneAndUpdate(
            { _id: action.wallet_id, user_id: decoded.userId },
            { $inc: { balance: -amount } }
          );
        }

        // 2. Tạo Transaction
        const tx = await Transaction.create({
          user_id: decoded.userId,
          type: 'expense',
          amount,
          date: now,
          description: action.description || 'Chi tiêu thông minh',
          category: action.category || 'other',
          wallet_id: action.wallet_id || undefined,
          walletName: action.walletName || 'Ví không xác định'
        });
        executedResults.push({ type: 'expense', id: tx._id, amount });

      } else if (action.actionType === 'income') {
        // 1. Cộng tiền ví
        if (action.wallet_id) {
          await Wallet.findOneAndUpdate(
            { _id: action.wallet_id, user_id: decoded.userId },
            { $inc: { balance: amount } }
          );
        }

        // 2. Tạo Transaction
        const tx = await Transaction.create({
          user_id: decoded.userId,
          type: 'income',
          amount,
          date: now,
          description: action.description || 'Thu nhập thông minh',
          category: action.category || 'other',
          wallet_id: action.wallet_id || undefined,
          walletName: action.walletName || 'Ví không xác định'
        });
        executedResults.push({ type: 'income', id: tx._id, amount });

      } else if (action.actionType === 'debt_lent') {
        // Cho vay / Trả hộ
        // 1. Trừ tiền ví nguồn
        if (action.wallet_id) {
          await Wallet.findOneAndUpdate(
            { _id: action.wallet_id, user_id: decoded.userId },
            { $inc: { balance: -amount } }
          );
          // Ghi chi tiêu cho việc chi tiền cho vay / trả hộ
          await Transaction.create({
            user_id: decoded.userId,
            type: 'expense',
            amount,
            date: now,
            description: `Trả hộ / Cho vay: ${action.person || 'Khác'} - ${action.description || ''}`,
            category: 'other',
            wallet_id: action.wallet_id,
            walletName: action.walletName || 'Ví không xác định'
          });
        }

        // 2. Tạo bản ghi Debt
        const debt = await Debt.create({
          user_id: decoded.userId,
          personName: action.person || 'Người quen',
          type: 'lent',
          status: 'unpaid',
          totalAmount: amount,
          remainingAmount: amount,
          history: [{
            date: now,
            amount,
            type: 'borrow_more',
            walletName: action.walletName || 'Tiền mặt'
          }]
        });
        executedResults.push({ type: 'debt_lent', id: debt._id, amount, person: action.person });

      } else if (action.actionType === 'debt_borrowed') {
        // Đi vay
        if (action.wallet_id) {
          await Wallet.findOneAndUpdate(
            { _id: action.wallet_id, user_id: decoded.userId },
            { $inc: { balance: amount } }
          );
          await Transaction.create({
            user_id: decoded.userId,
            type: 'income',
            amount,
            date: now,
            description: `Đi vay: ${action.person || 'Khác'} - ${action.description || ''}`,
            category: 'other',
            wallet_id: action.wallet_id,
            walletName: action.walletName || 'Ví không xác định'
          });
        }

        const debt = await Debt.create({
          user_id: decoded.userId,
          personName: action.person || 'Chủ nợ',
          type: 'borrowed',
          status: 'unpaid',
          totalAmount: amount,
          remainingAmount: amount,
          history: [{
            date: now,
            amount,
            type: 'borrow_more',
            walletName: action.walletName || 'Tiền mặt'
          }]
        });
        executedResults.push({ type: 'debt_borrowed', id: debt._id, amount, person: action.person });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã thực hiện thành công ${executedResults.length} hành động`,
      results: executedResults
    });
  } catch (error: any) {
    console.error("PUT /api/ai/smart-expense error:", error);
    return NextResponse.json({ error: error.message || 'Lỗi thực hiện hành động' }, { status: 500 });
  }
}
