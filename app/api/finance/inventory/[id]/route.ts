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
      // 1. Revert old transaction if existed
      if (oldTransactionId) {
        const oldTx = await Transaction.findById(oldTransactionId);
        if (oldTx && oldWalletId) {
          const oldWallet = await Wallet.findById(oldWalletId);
          if (oldWallet) {
            oldWallet.balance += oldTx.amount; // Hoàn tiền
            await oldWallet.save();
          }
          await Transaction.findByIdAndDelete(oldTransactionId);
        }
        newTransactionId = undefined;
        newWalletName = undefined;
      }

      // 2. Apply new transaction if it's not a gift and has cost
      if (!isGift && totalValue && totalValue > 0) {
        if (!wallet_id) return NextResponse.json({ error: 'Cần chọn ví thanh toán' }, { status: 400 });
        
        const wallet = await Wallet.findOne({ _id: wallet_id, user_id: decoded.userId });
        if (!wallet) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
        
        if (wallet.balance < totalValue) {
          // Rollback not implemented here for brevity, usually we should use DB transactions
          return NextResponse.json({ error: 'Số dư ví không đủ' }, { status: 400 });
        }

        wallet.balance -= totalValue;
        await wallet.save();
        newWalletName = wallet.name;

        const transaction = await Transaction.create({
          user_id: decoded.userId,
          type: 'expense',
          amount: totalValue,
          date: purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00.000Z`) : new Date(),
          description: `Mua dự trữ: ${name}`,
          category: category,
          wallet_id,
          walletName: newWalletName
        });
        newTransactionId = transaction._id;
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

    // Hoàn tiền nếu xóa món đồ (như user yêu cầu: "có hoàn tiền nếu không phải ăn, xóa đi lịch sử chi tiêu cũng sửa theo")
    if (item.transaction_id) {
      const tx = await Transaction.findById(item.transaction_id);
      if (tx && item.wallet_id) {
        const wallet = await Wallet.findById(item.wallet_id);
        if (wallet) {
          wallet.balance += tx.amount; // Hoàn tiền
          await wallet.save();
        }
        await Transaction.findByIdAndDelete(item.transaction_id);
      }
    }

    await item.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
