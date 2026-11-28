import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Inventory from '@/models/Inventory';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyToken } from '@/lib/auth';
import { getRequestNow } from '@/lib/simClock';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const {
      name, category, quantity, unit, purchaseDate, expiryDate,
      isGift, totalValue, wallet_id, justUpdateQty, justUpdateStockStatus,
      stock_status, operation, delta_quantity
    } = body;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    const item = await Inventory.findOne({ _id: id, user_id: decoded.userId });
    if (!item) return NextResponse.json({ error: 'Không tìm thấy đồ dự trữ' }, { status: 404 });

    // Handle 1-tap stock status update for spices & secondary ingredients
    if (justUpdateStockStatus || (stock_status && ['stable', 'low', 'out'].includes(stock_status))) {
      if (!['stable', 'low', 'out'].includes(stock_status)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
      }
      item.stock_status = stock_status;
      if (stock_status === 'out') {
        item.quantity = 0;
        item.totalValue = 0;
      } else if (item.quantity === 0) {
        item.quantity = stock_status === 'low' ? 1 : (item.originalQuantity || 1);
      }
      await item.save();
      return NextResponse.json(item);
    }

    // Handle simple quantity update (from +/- buttons or Yui add/deduct/set)
    if (justUpdateQty || operation === 'add' || operation === 'deduct') {
      let nextQty = quantity !== undefined ? Number(quantity) : item.quantity;
      const delta = Number(delta_quantity);
      if (operation === 'add' && !isNaN(delta) && delta > 0) {
        nextQty = Number((item.quantity + delta).toFixed(4));
      } else if (operation === 'deduct' && !isNaN(delta) && delta > 0) {
        nextQty = Math.max(0, Number((item.quantity - delta).toFixed(4)));
      }
      if (isNaN(nextQty) || nextQty < 0) return NextResponse.json({ error: 'Số lượng không hợp lệ' }, { status: 400 });
      const oldQty = item.quantity;
      if (nextQty === 0) {
        item.totalValue = 0;
      } else if (oldQty > 0 && item.totalValue && item.totalValue > 0) {
        const unitPrice = item.totalValue / oldQty;
        item.totalValue = Math.max(0, Math.round(unitPrice * nextQty));
      } else if (oldQty === 0 && nextQty > 0) {
        let baseValue = item.originalValue || 0;
        if (!baseValue && item.transaction_id) {
          const tx = await Transaction.findById(item.transaction_id);
          if (tx) baseValue = tx.amount;
        }
        if (baseValue > 0 && item.originalQuantity > 0) {
          const unitPrice = baseValue / item.originalQuantity;
          item.totalValue = Math.round(unitPrice * nextQty);
        }
      }
      item.quantity = nextQty;
      if (nextQty > item.originalQuantity) {
        item.originalQuantity = nextQty;
      }
      await item.save();
      return NextResponse.json(item);
    }

    // Full update from Edit Form (an toàn cho partial update từ Yui)
    const resolvedName = name || item.name;
    const resolvedCategory = category || item.category;
    const resolvedUnit = unit || item.unit;
    const resolvedQuantity = quantity !== undefined ? Number(quantity) : item.quantity;
    const resolvedIsGift = isGift !== undefined ? Boolean(isGift) : item.isGift;
    const resolvedTotalValue = totalValue !== undefined ? totalValue : item.totalValue;
    const resolvedWalletId = wallet_id !== undefined ? wallet_id : item.wallet_id?.toString();

    if (!resolvedName || !resolvedCategory || !resolvedUnit || isNaN(resolvedQuantity) || resolvedQuantity < 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }

    // Logic to handle Cashflow changes (chỉ kích hoạt khi client thực sự truyền field tài chính)
    const oldTransactionId = item.transaction_id;
    let newTransactionId = oldTransactionId;
    let newWalletName = item.walletName;

    const oldIsGift = item.isGift;
    const oldTotalValue = item.totalValue || 0;
    const oldWalletId = item.wallet_id?.toString();
    const financialFieldsSent = isGift !== undefined || totalValue !== undefined || wallet_id !== undefined;
    const hasFinancialChange = financialFieldsSent && (
      (oldIsGift !== resolvedIsGift) ||
      (oldTotalValue !== (resolvedTotalValue || 0)) ||
      (oldWalletId !== resolvedWalletId)
    );
    const txCategory = (resolvedCategory === 'food' || resolvedCategory === 'spices') ? 'food' : 'shopping';

    if (hasFinancialChange) {
      let oldTxAmount = 0;

      // 1. Revert old transaction if existed
      if (oldTransactionId) {
        const oldTx = await Transaction.findById(oldTransactionId);
        if (oldTx && oldWalletId) {
          oldTxAmount = oldTx.amount;
          await Wallet.findOneAndUpdate(
            { _id: oldWalletId, user_id: decoded.userId },
            { $inc: { balance: oldTx.amount } }
          );
          await Transaction.findByIdAndDelete(oldTransactionId);
        }
        newTransactionId = undefined;
        newWalletName = undefined;
      }

      // 2. Apply new transaction if it's not a gift and has cost
      if (!resolvedIsGift && resolvedTotalValue !== undefined && resolvedTotalValue !== null && resolvedTotalValue > 0) {
        if (!resolvedWalletId) return NextResponse.json({ error: 'Cần chọn ví thanh toán' }, { status: 400 });

        const diff = resolvedTotalValue - oldTotalValue;
        const newTxAmount = oldTxAmount > 0 ? oldTxAmount + diff : resolvedTotalValue;

        if (newTxAmount > 0) {
          const wallet = await Wallet.findOneAndUpdate(
            { _id: resolvedWalletId, user_id: decoded.userId, balance: { $gte: newTxAmount } },
            { $inc: { balance: -newTxAmount } },
            { returnDocument: 'after' }
          );

          if (!wallet) {
            if (oldTxAmount > 0 && oldWalletId) {
              await Wallet.findOneAndUpdate(
                { _id: oldWalletId, user_id: decoded.userId },
                { $inc: { balance: -oldTxAmount } }
              );
            }
            const exists = await Wallet.findOne({ _id: resolvedWalletId, user_id: decoded.userId });
            if (!exists) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
            return NextResponse.json({ error: 'Số dư ví không đủ' }, { status: 400 });
          }

          newWalletName = wallet.name;

          const transaction = await Transaction.create({
            user_id: decoded.userId,
            type: 'expense',
            amount: newTxAmount,
            date: purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00+07:00`) : getRequestNow(req),
            description: `Mua dự trữ: ${resolvedName}`,
            category: txCategory,
            wallet_id: resolvedWalletId,
            walletName: newWalletName
          });
          newTransactionId = transaction._id;
        }
      }
    } else if (oldTransactionId && (name || category || purchaseDate)) {
      await Transaction.findByIdAndUpdate(oldTransactionId, {
        description: `Mua dự trữ: ${resolvedName}`,
        category: txCategory,
        date: purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00+07:00`) : item.purchaseDate
      });
    }

    item.name = resolvedName;
    item.category = resolvedCategory;
    item.stock_status = stock_status || item.stock_status || (resolvedCategory === 'spices' ? 'stable' : undefined);
    item.quantity = resolvedQuantity;
    item.unit = resolvedUnit;
    item.purchaseDate = purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00+07:00`) : item.purchaseDate;
    if (expiryDate !== undefined) {
      item.expiryDate = expiryDate ? new Date(`${expiryDate.split('T')[0]}T12:00:00+07:00`) : undefined;
    }
    item.isGift = resolvedIsGift;
    item.totalValue = resolvedTotalValue;
    item.originalValue = resolvedTotalValue;
    item.wallet_id = (!resolvedIsGift && (resolvedTotalValue || 0) > 0) ? (resolvedWalletId as any) : undefined;
    item.walletName = newWalletName;
    item.transaction_id = newTransactionId;
    item.originalQuantity = Math.max(resolvedQuantity, item.originalQuantity || 0);

    await item.save();
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const item = await Inventory.findOne({ _id: id, user_id: decoded.userId });

    if (!item) return NextResponse.json({ error: 'Không tìm thấy đồ dự trữ' }, { status: 404 });

    // Hỗ trợ ?discard=true (v1.2): vứt đồ hỏng/quá hạn KHÔNG hoàn tiền ngược về ví
    const { searchParams } = new URL(req.url);
    const isDiscard = searchParams.get('discard') === 'true';

    // Hoàn tiền nếu xóa nhầm món đồ (không áp dụng khi vứt đồ hỏng ?discard=true):
    // Nếu quantity <= 0 hoặc totalValue <= 0, có nghĩa là đã dùng hết -> Không hoàn tiền, giữ nguyên lịch sử giao dịch.
    // Nếu chưa dùng hết, hoàn lại số tiền tương ứng với lượng giá trị còn lại (totalValue).
    const currentTotalValue = Math.round(item.totalValue || 0);
    if (!isDiscard && item.transaction_id && item.quantity > 0 && currentTotalValue > 0) {
      const tx = await Transaction.findById(item.transaction_id);
      if (tx && item.wallet_id) {
        // Nếu số lượng còn nguyên vẹn hoặc giá trị còn lại >= số tiền giao dịch ban đầu:
        // Hoàn lại toàn bộ chi tiêu gốc và xóa bản ghi transaction
        if (currentTotalValue >= tx.amount || item.quantity >= (item.originalQuantity || 1)) {
          const refundAmount = Math.round(tx.amount);
          await Wallet.findOneAndUpdate(
            { _id: item.wallet_id, user_id: decoded.userId },
            { $inc: { balance: refundAmount } }
          );
          await Transaction.findByIdAndDelete(item.transaction_id);
        } else {
          // Nếu đã dùng một phần: hoàn lại giá trị còn lại, đảm bảo tx.amount còn lại luôn >= 1
          const refundAmount = Math.min(currentTotalValue, Math.max(0, tx.amount - 1));
          if (refundAmount > 0) {
            await Wallet.findOneAndUpdate(
              { _id: item.wallet_id, user_id: decoded.userId },
              { $inc: { balance: refundAmount } }
            );
            tx.amount -= refundAmount;
            await tx.save();
          }
        }
      }
    }

    await item.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
