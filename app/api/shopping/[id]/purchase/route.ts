import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import ShoppingItem from '@/models/ShoppingItem';
import Inventory from '@/models/Inventory';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyToken } from '@/lib/auth';
import { getRequestNow } from '@/lib/simClock';
import { parseVnDateTime } from '@/lib/vnTime';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    const shoppingItem = await ShoppingItem.findOne({ _id: id, user_id: decoded.userId });
    if (!shoppingItem) {
      return NextResponse.json({ error: 'Không tìm thấy món hàng trong danh sách đi chợ' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const rawAmount = body.amount !== undefined ? Number(body.amount) : 0;
    const cleanAmount = isNaN(rawAmount) ? -1 : Math.round(rawAmount);
    const isGift = Boolean(body.isGift) || cleanAmount === 0;
    const addToInventory = body.addToInventory !== false;
    const walletId = body.wallet_id ? String(body.wallet_id).trim() : '';

    if (cleanAmount < 0 || cleanAmount > 1_000_000_000) {
      return NextResponse.json({ error: 'Số tiền thanh toán không hợp lệ' }, { status: 400 });
    }

    const qty = body.quantity !== undefined ? Number(body.quantity) : shoppingItem.quantity;
    if (isNaN(qty) || qty <= 0 || qty > 10000) {
      return NextResponse.json({ error: 'Số lượng phải lớn hơn 0 và không vượt quá 10,000' }, { status: 400 });
    }

    const unit = body.unit ? String(body.unit).trim() : shoppingItem.unit;
    if (!unit || unit.length > 50) {
      return NextResponse.json({ error: 'Đơn vị không hợp lệ' }, { status: 400 });
    }

    // Map shopping category -> inventory category
    const defaultInvCategory =
      shoppingItem.category === 'food' ? 'food' : 'utilities';
    const invCategory = ['food', 'spices', 'utilities'].includes(body.inventoryCategory)
      ? body.inventoryCategory
      : defaultInvCategory;

    const now = getRequestNow(req);
    const parsedPurchaseDate = body.purchaseDate
      ? (parseVnDateTime(body.purchaseDate, '12:00:00') ?? now)
      : now;
    let parsedExpiryDate: Date | undefined = undefined;
    if (body.expiryDate) {
      const expStr = String(body.expiryDate).trim();
      if (expStr) {
        const d = expStr.includes('T')
          ? new Date(expStr)
          : new Date(`${expStr.split('T')[0]}T12:00:00+07:00`);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Hạn sử dụng không hợp lệ' }, { status: 400 });
        }
        parsedExpiryDate = d;
      }
    }

    // 1. Validate & atomically deduct wallet FIRST before mutating shopping/inventory (PM constraint)
    let walletDoc: any = null;
    if (!isGift && cleanAmount > 0) {
      if (!walletId || !mongoose.Types.ObjectId.isValid(walletId)) {
        return NextResponse.json({ error: 'Cần chọn ví thanh toán hợp lệ' }, { status: 400 });
      }
      walletDoc = await Wallet.findOneAndUpdate(
        { _id: walletId, user_id: decoded.userId, balance: { $gte: cleanAmount } },
        { $inc: { balance: -cleanAmount } },
        { returnDocument: 'after' }
      );
      if (!walletDoc) {
        const exists = await Wallet.findOne({ _id: walletId, user_id: decoded.userId });
        if (!exists) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
        return NextResponse.json({ error: 'Số dư ví không đủ' }, { status: 400 });
      }
    }

    // 2. Create Transaction + Inventory + mark ShoppingItem checked (with rollback on error)
    let createdTx: any = null;
    let createdInv: any = null;
    try {
      if (!isGift && cleanAmount > 0 && walletDoc) {
        const txCategory = (invCategory === 'food' || invCategory === 'spices') ? 'food' : 'shopping';
        createdTx = await Transaction.create({
          user_id: decoded.userId,
          type: 'expense',
          amount: cleanAmount,
          date: parsedPurchaseDate,
          description: `Mua & cất kho: ${shoppingItem.name}`,
          category: txCategory,
          wallet_id: walletDoc._id,
          walletName: walletDoc.name
        });
      }

      if (addToInventory) {
        createdInv = await Inventory.create({
          user_id: decoded.userId,
          name: shoppingItem.name,
          category: invCategory,
          stock_status: invCategory === 'spices' ? 'stable' : undefined,
          quantity: qty,
          originalQuantity: qty,
          unit,
          purchaseDate: parsedPurchaseDate,
          expiryDate: parsedExpiryDate,
          isGift,
          totalValue: !isGift && cleanAmount > 0 ? cleanAmount : undefined,
          originalValue: !isGift && cleanAmount > 0 ? cleanAmount : undefined,
          wallet_id: !isGift && cleanAmount > 0 && walletDoc ? walletDoc._id : undefined,
          walletName: walletDoc?.name,
          transaction_id: createdTx?._id
        });
      }

      shoppingItem.checked = true;
      shoppingItem.checkedAt = now;
      await shoppingItem.save();

      return NextResponse.json({
        message: addToInventory
          ? `Đã mua "${shoppingItem.name}" và cất vào kho thành công!`
          : `Đã đánh dấu mua "${shoppingItem.name}" thành công!`,
        shoppingItem,
        inventoryItem: createdInv,
        transaction: createdTx,
        walletBalance: walletDoc ? walletDoc.balance : undefined
      }, { status: 201 });
    } catch (innerErr) {
      // Rollback wallet + tx + inventory on partial failure
      if (walletDoc && cleanAmount > 0) {
        await Wallet.findOneAndUpdate(
          { _id: walletDoc._id, user_id: decoded.userId },
          { $inc: { balance: cleanAmount } }
        );
      }
      if (createdTx?._id) {
        await Transaction.findByIdAndDelete(createdTx._id);
      }
      if (createdInv?._id) {
        await Inventory.findByIdAndDelete(createdInv._id);
      }
      throw innerErr;
    }
  } catch (error: any) {
    console.error('POST /api/shopping/[id]/purchase error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
