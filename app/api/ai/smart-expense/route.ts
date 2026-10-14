import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { parseYuiRequest, executeYuiActions } from '@/lib/yuiEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp nội dung cần phân tích' }, { status: 400 });
    }

    const data = await parseYuiRequest(decoded.userId, text.trim());

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error("POST /api/ai/smart-expense error:", error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý AI' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const body = await req.json();
    const { actions } = body;

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: 'Danh sách hành động không hợp lệ' }, { status: 400 });
    }

    const executedResults = await executeYuiActions(decoded.userId, actions);

    return NextResponse.json({
      success: true,
      message: `Đã thực hiện thành công ${executedResults.length} hành động`,
      results: executedResults
    });
  } catch (error: any) {
    console.error("PUT /api/ai/smart-expense error:", error);
    return NextResponse.json({ error: error.message || 'Lỗi thực hiện hành động' }, { status: 500 });
  }
}
