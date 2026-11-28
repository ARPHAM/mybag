import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Debt from '@/models/Debt';
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
    const { action, actionAmount, wallet_id, personName, dueDate, date } = body;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    const debt = await Debt.findOne({ _id: id, user_id: decoded.userId });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy sổ nợ' }, { status: 404 });

    // Handle Action (Pay back / Borrow more)
    if (action) {
      if (!['pay_back', 'borrow_more'].includes(action)) {
        return NextResponse.json({ error: 'Loại thao tác nợ không hợp lệ' }, { status: 400 });
      }
      const cleanActionAmount = Math.round(Number(actionAmount));
      if (!cleanActionAmount || cleanActionAmount <= 0 || !wallet_id) {
        return NextResponse.json({ error: 'Thông tin giao dịch không hợp lệ' }, { status: 400 });
      }

      if (action === 'pay_back' && cleanActionAmount > debt.remainingAmount) {
        return NextResponse.json({ error: 'Số tiền trả không thể lớn hơn số nợ còn lại' }, { status: 400 });
      }

      let wallet;
      let transactionType: 'income' | 'expense';
      let description = '';
      const actionDate = date ? new Date(date) : getRequestNow(req);

      if (action === 'pay_back') {
        if (debt.type === 'lent') {
          // Người ta trả tiền cho mình => Mình nhận thu nhập (cộng tiền vào ví an toàn)
          wallet = await Wallet.findOneAndUpdate(
            { _id: wallet_id, user_id: decoded.userId },
            { $inc: { balance: cleanActionAmount } },
            { returnDocument: 'after' }
          );
          if (!wallet) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
          transactionType = 'income';
          description = `${debt.personName} trả tiền nợ`;
        } else {
          // Mình trả tiền cho người ta => Chi tiêu (trừ tiền atomic có kiểm tra số dư)
          wallet = await Wallet.findOneAndUpdate(
            { _id: wallet_id, user_id: decoded.userId, balance: { $gte: cleanActionAmount } },
            { $inc: { balance: -cleanActionAmount } },
            { returnDocument: 'after' }
          );
          if (!wallet) return NextResponse.json({ error: 'Số dư ví không đủ để thanh toán nợ' }, { status: 400 });
          transactionType = 'expense';
          description = `Trả tiền nợ cho ${debt.personName}`;
        }
      } else {
        // borrow_more
        if (debt.type === 'lent') {
          // Mình cho người ta vay thêm => Chi tiêu (trừ tiền atomic có kiểm tra số dư)
          wallet = await Wallet.findOneAndUpdate(
            { _id: wallet_id, user_id: decoded.userId, balance: { $gte: cleanActionAmount } },
            { $inc: { balance: -cleanActionAmount } },
            { returnDocument: 'after' }
          );
          if (!wallet) return NextResponse.json({ error: 'Số dư ví không đủ để cho vay thêm' }, { status: 400 });
          transactionType = 'expense';
          description = `Cho ${debt.personName} vay thêm`;
        } else {
          // Mình vay thêm người ta => Thu nhập (cộng tiền vào ví)
          wallet = await Wallet.findOneAndUpdate(
            { _id: wallet_id, user_id: decoded.userId },
            { $inc: { balance: cleanActionAmount } },
            { returnDocument: 'after' }
          );
          if (!wallet) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
          transactionType = 'income';
          description = `Vay thêm của ${debt.personName}`;
        }
      }

      let txId;
      try {
        const tx = await Transaction.create({
          user_id: decoded.userId,
          type: transactionType,
          amount: cleanActionAmount,
          date: actionDate,
          description,
          category: 'debt_loan',
          wallet_id,
          walletName: wallet.name
        });
        txId = tx._id;

        if (action === 'pay_back') {
          debt.remainingAmount -= cleanActionAmount;
          if (debt.remainingAmount <= 0) {
            debt.remainingAmount = 0;
            debt.status = 'paid';
            debt.completedDate = actionDate;
          } else {
            debt.status = 'partial';
          }
        } else {
          debt.totalAmount += cleanActionAmount;
          debt.remainingAmount += cleanActionAmount;
          debt.status = debt.remainingAmount < debt.totalAmount ? 'partial' : 'unpaid';
        }

        debt.history.push({
          date: actionDate,
          amount: cleanActionAmount,
          type: action,
          walletName: wallet.name
        } as any);

        await debt.save();
        return NextResponse.json(debt);
      } catch (err: any) {
        // Rollback ví và transaction nếu lưu thất bại
        if (action === 'pay_back') {
          if (debt.type === 'lent') {
            await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: decoded.userId }, { $inc: { balance: -cleanActionAmount } });
          } else {
            await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: decoded.userId }, { $inc: { balance: cleanActionAmount } });
          }
        } else {
          if (debt.type === 'lent') {
            await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: decoded.userId }, { $inc: { balance: cleanActionAmount } });
          } else {
            await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: decoded.userId }, { $inc: { balance: -cleanActionAmount } });
          }
        }
        if (txId) {
          await Transaction.findByIdAndDelete(txId);
        }
        throw err;
      }
    }

    // Handle Normal Update (Edit details)
    else {
      if (personName) debt.personName = personName;
      if (dueDate) debt.dueDate = new Date(dueDate);
      await debt.save();
      return NextResponse.json(debt);
    }

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

    // Chỉ xóa record sổ nợ, KHÔNG rollback transactions để tránh sai lệch ví nếu transactions đã cũ
    const debt = await Debt.findOneAndDelete({ _id: id, user_id: decoded.userId });

    if (!debt) {
      return NextResponse.json({ error: 'Không tìm thấy sổ nợ' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
