import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
import Inventory from '@/models/Inventory';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyToken } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const meal = await MealLog.findOne({ _id: id, user_id: decoded.userId });
    if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 });

    // Hoàn tác
    if (meal.source === 'eat_out' && meal.transaction_id) {
      const tx = await Transaction.findById(meal.transaction_id);
      if (tx) {
        // Hoàn lại tiền vào ví
        await Wallet.findByIdAndUpdate(tx.wallet_id, { $inc: { balance: tx.amount } });
        await Transaction.findByIdAndDelete(tx._id);
      }
    } else if (meal.source === 'home' && meal.ingredients_used) {
      // Hoàn lại số lượng kho
      for (const ing of meal.ingredients_used) {
        const item = await Inventory.findOne({ _id: ing.invId, user_id: decoded.userId });
        if (item) {
          item.quantity += ing.qty;
          await item.save();
        }
      }
    }

    await MealLog.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Đã xóa bữa ăn' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const meal = await MealLog.findOne({ _id: id, user_id: decoded.userId });
    if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 });

    const body = await req.json();
    const { food_name, consumed_at, recipe_id, source, ingredients_used, cost, ingredients_text, wallet_id } = body;

    // --- VALIDATION PHASE ---
    let txToRevert = null;
    if (meal.source === 'eat_out' && meal.transaction_id) {
      txToRevert = await Transaction.findById(meal.transaction_id);
    }
    
    if (source === 'eat_out' && cost > 0 && wallet_id) {
      const newWallet = await Wallet.findById(wallet_id);
      if (!newWallet) return NextResponse.json({ error: 'Ví thanh toán không tồn tại' }, { status: 400 });
      
      let availableBalance = newWallet.balance;
      // If same wallet, simulate the refund first
      if (txToRevert && txToRevert.wallet_id?.toString() === wallet_id) {
        availableBalance += txToRevert.amount;
      }
      
      if (availableBalance < cost) {
        return NextResponse.json({ error: 'Số dư ví không đủ' }, { status: 400 });
      }
    }

    // --- EXECUTION PHASE ---
    // 1. REVERT OLD CHANGES
    if (txToRevert) {
      await Wallet.findByIdAndUpdate(txToRevert.wallet_id, { $inc: { balance: txToRevert.amount } });
      await Transaction.findByIdAndDelete(txToRevert._id);
    } else if (meal.source === 'home' && meal.ingredients_used) {
      for (const ing of meal.ingredients_used) {
        const item = await Inventory.findOne({ _id: ing.invId, user_id: decoded.userId });
        if (item) {
          item.quantity += ing.qty;
          await item.save();
        }
      }
    }

    // 2. APPLY NEW CHANGES
    let calculatedCost = 0;
    let new_transaction_id = null;

    if (source === 'home' && ingredients_used && Array.isArray(ingredients_used)) {
      for (const ing of ingredients_used) {
        if (ing.invId && ing.qty > 0) {
          const item = await Inventory.findOne({ _id: ing.invId, user_id: decoded.userId });
          if (item) {
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
      const wallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId },
        { $inc: { balance: -cost } },
        { returnDocument: 'after' }
      );
      
      if (!wallet) return NextResponse.json({ error: 'Không thể trừ tiền từ ví này' }, { status: 400 });

      const newTx = await Transaction.create({
        user_id: decoded.userId,
        type: 'expense',
        amount: cost,
        date: consumed_at ? new Date(consumed_at) : new Date(),
        description: `[Ăn ngoài] ${food_name}`,
        category: 'food',
        wallet_id: wallet._id,
        walletName: wallet.name
      });
      new_transaction_id = newTx._id;
    }

    // 3. UPDATE MEALLOG
    meal.food_name = food_name;
    meal.consumed_at = consumed_at ? new Date(consumed_at) : meal.consumed_at;
    meal.recipe_id = recipe_id || null;
    meal.source = source || 'home';
    meal.ingredients_text = ingredients_text || undefined;
    meal.cost = source === 'home' ? calculatedCost : (cost || 0);
    meal.ingredients_used = source === 'home' ? ingredients_used : undefined;
    meal.transaction_id = new_transaction_id;
    meal.wallet_id = source === 'eat_out' ? wallet_id : undefined;
    meal.ai_status = 'pending'; // Need re-calculation
    
    await meal.save();

    return NextResponse.json({ message: 'Đã cập nhật bữa ăn!', mealLog: meal });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
