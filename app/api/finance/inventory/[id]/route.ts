import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Inventory from '@/models/Inventory';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyToken } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { name, category, quantity, unit, purchaseDate, expiryDate, isGift, totalValue, wallet_id, justUpdateQty } = body;
    const { id } = await params;

    const item = await Inventory.findOne({ _id: id, user_id: decoded.userId });
    if (!item) return NextResponse.json({ error: 'Không tìm thấy đồ dự trữ' }, { status: 404 });

    // Handle simple quantity update (from +/- buttons)
    if (justUpdateQty) {
      if (quantity === undefined || quantity < 0) return NextResponse.json({ error: 'Số lượng không hợp lệ' }, { status: 400 });
      item.quantity = quantity;
      await item.save();
      return NextResponse.json(item);
    }

    // Full update from Edit Form
    if (!name || !category || !unit || quantity === undefined || quantity < 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }

    // Logic to handle Cashflow changes
    const oldTransactionId = item.transaction_id;
    let newTransactionId = oldTransactionId;
    let newWalletName = item.walletName;

    const oldIsGift = item.isGift;
    const oldTotalValue = item.totalValue || 0;
    const oldWalletId = item.wallet_id?.toString();

    const hasFinancialChange = (oldIsGift !== isGift) || (oldTotalValue !== totalValue) || (oldWalletId !== wallet_id);

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
      if (!isGift && totalValue !== undefined && totalValue !== null) {
        if (!wallet_id) return NextResponse.json({ error: 'Cần chọn ví thanh toán' }, { status: 400 });
        
        // Số tiền giao dịch mới = Tiền gốc ban đầu + (Giá trị tổng mới - Giá trị tổng hiện tại)
        const diff = totalValue - oldTotalValue;
        const newTxAmount = oldTxAmount + diff;

        if (newTxAmount > 0) {
          const wallet = await Wallet.findOneAndUpdate(
            { _id: wallet_id, user_id: decoded.userId, balance: { $gte: newTxAmount } },
            { $inc: { balance: -newTxAmount } },
            { returnDocument: 'after' }
          );

          if (!wallet) {
            // Rollback oldTx refund if new wallet balance fails
            if (oldTxAmount > 0 && oldWalletId) {
              await Wallet.findOneAndUpdate(
                { _id: oldWalletId, user_id: decoded.userId },
                { $inc: { balance: -oldTxAmount } }
              );
            }
            const exists = await Wallet.findOne({ _id: wallet_id, user_id: decoded.userId });
            if (!exists) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
            return NextResponse.json({ error: 'Số dư ví không đủ' }, { status: 400 });
          }

          newWalletName = wallet.name;

          const transaction = await Transaction.create({
            user_id: decoded.userId,
            type: 'expense',
            amount: newTxAmount,
            date: purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00.000Z`) : new Date(),
            description: `Mua dự trữ: ${name}`,
            category: category,
            wallet_id,
            walletName: newWalletName
          });
          newTransactionId = transaction._id;
        }
      }
    } else if (oldTransactionId) {
      // If no financial change but name/category/date changed, update description and date
      await Transaction.findByIdAndUpdate(oldTransactionId, {
        description: `Mua dự trữ: ${name}`,
        category: category,
        date: purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00.000Z`) : item.purchaseDate
      });
    }

    item.name = name;
    item.category = category;
    item.quantity = quantity;
    item.unit = unit;
    item.purchaseDate = purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00.000Z`) : item.purchaseDate;
    item.expiryDate = expiryDate ? new Date(`${expiryDate.split('T')[0]}T12:00:00.000Z`) : undefined;
    item.isGift = isGift;
    item.totalValue = totalValue;
    item.wallet_id = (!isGift && totalValue > 0) ? wallet_id : undefined;
    item.walletName = newWalletName;
    item.transaction_id = newTransactionId;

    // Since +/- and Edit form here are just for re-defining the portions,
    // originalQuantity always tracks the current quantity.
    item.originalQuantity = quantity;

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
    const item = await Inventory.findOne({ _id: id, user_id: decoded.userId });
    
    if (!item) return NextResponse.json({ error: 'Không tìm thấy đồ dự trữ' }, { status: 404 });

    // Hoàn tiền nếu xóa món đồ:
    // Nếu quantity <= 0 hoặc totalValue <= 0, có nghĩa là đã dùng hết -> Không hoàn tiền, giữ nguyên lịch sử giao dịch.
    // Nếu chưa dùng hết, hoàn lại số tiền tương ứng với lượng giá trị còn lại (totalValue).
    const currentTotalValue = item.totalValue || 0;
    if (item.transaction_id && item.quantity > 0 && currentTotalValue > 0) {
      const tx = await Transaction.findById(item.transaction_id);
      if (tx && item.wallet_id) {
        // Nếu số lượng vẫn y nguyên lúc mua (chưa ăn), hoặc totalValue == tx.amount
        if (currentTotalValue === tx.amount || item.quantity === item.originalQuantity) {
          await Wallet.findOneAndUpdate(
            { _id: item.wallet_id, user_id: decoded.userId },
            { $inc: { balance: tx.amount } }
          );
          await Transaction.findByIdAndDelete(item.transaction_id); // Xóa chi tiêu
        } else {
          // Nếu đã ăn một phần
          await Wallet.findOneAndUpdate(
            { _id: item.wallet_id, user_id: decoded.userId },
            { $inc: { balance: currentTotalValue } }
          );
          tx.amount -= currentTotalValue; // Giảm giá trị chi tiêu đi phần hoàn lại
          await tx.save();
        }
      }
    }

    await item.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
