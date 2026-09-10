import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const transaction = await Transaction.findOne({ _id: params.id, user_id: decoded.userId });
    if (!transaction) return NextResponse.json({ error: 'Giao dịch không tồn tại' }, { status: 404 });

    const { type, amount, wallet_id, to_wallet_id } = transaction;

    if (type === 'income') {
      // Hủy Thu nhập -> Trừ tiền ví (kiểm tra số dư)
      const wallet = await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } }
      );
      if (!wallet) return NextResponse.json({ error: 'Không thể hủy do ví không đủ số dư để hoàn trả' }, { status: 400 });
    } 
    else if (type === 'expense') {
      // Hủy Chi tiêu -> Cộng tiền lại ví
      await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId },
        { $inc: { balance: amount } }
      );
    } 
    else if (type === 'transfer') {
      // Hủy Chuyển khoản -> Trừ tiền ví nhận & Cộng tiền ví nguồn
      // Bước 1: Trừ tiền ví nhận (phải đảm bảo ví nhận đủ tiền hoàn trả)
      const destWallet = await Wallet.findOneAndUpdate(
        { _id: to_wallet_id, user_id: decoded.userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } }
      );
      if (!destWallet) return NextResponse.json({ error: 'Ví nhận không đủ số dư để hoàn tiền' }, { status: 400 });

      // Bước 2: Cộng tiền ví nguồn
      await Wallet.findOneAndUpdate(
        { _id: wallet_id, user_id: decoded.userId },
        { $inc: { balance: amount } }
      );
    }

    await Transaction.deleteOne({ _id: params.id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
