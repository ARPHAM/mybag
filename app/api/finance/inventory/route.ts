import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Inventory from '@/models/Inventory';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const items = await Inventory.find({ user_id: decoded.userId }).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { name, category, quantity, unit, purchaseDate, expiryDate, isGift, totalValue, wallet_id } = body;

    if (!name || !category || !unit || quantity === undefined || quantity < 0) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
    }

    let transactionId = undefined;
    let walletName = undefined;

    // Handle payment if it's not a gift and has cost
    if (!isGift && totalValue && totalValue > 0) {
      if (!wallet_id) return NextResponse.json({ error: 'Cần chọn ví thanh toán' }, { status: 400 });
      
      const wallet = await Wallet.findOne({ _id: wallet_id, user_id: decoded.userId });
      if (!wallet) return NextResponse.json({ error: 'Nguồn tiền không tồn tại' }, { status: 404 });
      
      if (wallet.balance < totalValue) {
        return NextResponse.json({ error: 'Số dư ví không đủ' }, { status: 400 });
      }

      wallet.balance -= totalValue;
      await wallet.save();
      walletName = wallet.name;

      const transaction = await Transaction.create({
        user_id: decoded.userId,
        type: 'expense',
        amount: totalValue,
        date: purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00.000Z`) : new Date(),
        description: `Mua dự trữ: ${name}`,
        category: category,
        wallet_id,
        walletName
      });
      transactionId = transaction._id;
    }

    const item = await Inventory.create({
      user_id: decoded.userId,
      name,
      category,
      quantity,
      originalQuantity: quantity,
      unit,
      purchaseDate: purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00.000Z`) : new Date(),
      expiryDate: expiryDate ? new Date(`${expiryDate.split('T')[0]}T12:00:00.000Z`) : undefined,
      isGift,
      totalValue,
      wallet_id: (!isGift && totalValue > 0) ? wallet_id : undefined,
      walletName,
      transaction_id: transactionId
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
