import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Inventory from '@/models/Inventory';
import { verifyToken } from '@/lib/auth';
import { getRequestNow } from '@/lib/simClock';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const now = getRequestNow(req);
    const expiredItems = await Inventory.find({
      user_id: decoded.userId,
      category: { $ne: 'spices' },
      quantity: { $gt: 0 },
      expiryDate: { $lt: now }
    }).select('_id name').lean();

    if (expiredItems.length === 0) {
      return NextResponse.json({
        message: 'Tủ lạnh sạch sẽ, không có món nào quá hạn!',
        discardedCount: 0,
        discardedNames: []
      });
    }

    const ids = expiredItems.map((i: any) => i._id);
    const names = expiredItems.map((i: any) => i.name);

    // Dọn đồ quá hạn không hoàn tiền về ví (tránh làm sai lệch lịch sử tài chính)
    await Inventory.deleteMany({ _id: { $in: ids }, user_id: decoded.userId });

    return NextResponse.json({
      message: `Đã dọn ${expiredItems.length} món quá hạn khỏi tủ lạnh (giữ nguyên sổ chi tiêu).`,
      discardedCount: expiredItems.length,
      discardedNames: names
    });
  } catch (error: any) {
    console.error('POST /api/finance/inventory/cleanup-expired error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
