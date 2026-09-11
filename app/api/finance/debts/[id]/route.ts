import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Debt from '@/models/Debt';
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
    const { action, actionAmount, wallet_id, personName, dueDate } = body;
    const { id } = await params;

    const debt = await Debt.findOne({ _id: id, user_id: decoded.userId });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy sổ nợ' }, { status: 404 });

    // Handle Action (Pay back / Borrow more)
    if (action) {
      if (!actionAmount || actionAmount <= 0 || !wallet_id) {
        return NextResponse.json({ error: 'Thông tin giao dịch không hợp lệ' }, { status: 400 });
      }

      if (action === 'pay_back' && actionAmount > debt.remainingAmount) {
        return NextResponse.json({ error: 'Số tiền trả không thể lớn hơn số nợ còn lại' }, { status: 400 });
      }

      const wallet = await Wallet.findOne({ _id: wallet_id, user_id: decoded.userId });
      if (!wallet) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });

      let transactionType: 'income' | 'expense';
      let description = '';

      if (action === 'pay_back') {
        if (debt.type === 'lent') {
          // Người ta trả tiền cho mình => Mình nhận thu nhập
          transactionType = 'income';
          description = `${debt.personName} trả tiền nợ`;
          wallet.balance += actionAmount;
        } else {
          // Mình trả tiền cho người ta => Chi tiêu
          if (wallet.balance < actionAmount) return NextResponse.json({ error: 'Số dư ví không đủ' }, { status: 400 });
          transactionType = 'expense';
          description = `Trả tiền nợ cho ${debt.personName}`;
          wallet.balance -= actionAmount;
        }
        debt.remainingAmount -= actionAmount;
        if (debt.remainingAmount === 0) {
          debt.status = 'paid';
          debt.completedDate = new Date();
        } else {
          debt.status = 'partial';
        }
      } else {
        // borrow_more
        if (debt.type === 'lent') {
          // Mình cho người ta vay thêm => Chi tiêu
          if (wallet.balance < actionAmount) return NextResponse.json({ error: 'Số dư ví không đủ' }, { status: 400 });
          transactionType = 'expense';
          description = `Cho ${debt.personName} vay thêm`;
          wallet.balance -= actionAmount;
        } else {
          // Mình vay thêm người ta => Thu nhập
          transactionType = 'income';
          description = `Vay thêm của ${debt.personName}`;
          wallet.balance += actionAmount;
        }
        debt.totalAmount += actionAmount;
        debt.remainingAmount += actionAmount;
        debt.status = 'unpaid';
      }

      await wallet.save();

      await Transaction.create({
        user_id: decoded.userId,
        type: transactionType,
        amount: actionAmount,
        date: new Date(),
        description,
        category: 'other',
        wallet_id,
        walletName: wallet.name
      });

      debt.history.push({
        date: new Date(),
        amount: actionAmount,
        type: action,
        walletName: wallet.name
      } as any);

      await debt.save();
      return NextResponse.json(debt);
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
