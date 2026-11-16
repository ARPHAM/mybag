import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { parseYuiRequest, executeYuiActions, getYuiProactiveBriefing } from '@/lib/yuiEngine';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId(): Promise<string | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = await verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
  return decoded.userId;
}

export async function GET() {
  try {
    const auth = await getAuthenticatedUserId();
    if (auth instanceof NextResponse) return auth;

    const briefing = await getYuiProactiveBriefing(auth);
    return NextResponse.json({ success: true, data: briefing });
  } catch (error: unknown) {
    console.error('GET /api/ai/yui error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi tải nhắc nhở Yui';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserId();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { text, history, imageData } = body;

    const cleanText = typeof text === 'string' ? text.trim() : '';
    const hasValidImage = typeof imageData === 'string' && imageData.startsWith('data:image/');

    if (!cleanText && !hasValidImage) {
      return NextResponse.json({ error: 'Vui lòng nhập nội dung hoặc đính kèm hình ảnh cho Yui' }, { status: 400 });
    }

    if (hasValidImage && imageData.length > 6 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ảnh đính kèm quá lớn, vui lòng chọn ảnh nhỏ hơn' }, { status: 400 });
    }

    const data = await parseYuiRequest(
      auth,
      cleanText,
      Array.isArray(history) ? history : [],
      hasValidImage ? imageData : undefined
    );

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: unknown) {
    console.error('POST /api/ai/yui error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi xử lý của Yui';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await getAuthenticatedUserId();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { actions } = body;

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: 'Danh sách hành động không hợp lệ' }, { status: 400 });
    }

    const executedResults = await executeYuiActions(auth, actions);

    return NextResponse.json({
      success: true,
      message: `Yui đã ghi nhận thành công ${executedResults.length} mục vào hệ thống!`,
      results: executedResults
    });
  } catch (error: unknown) {
    console.error('PUT /api/ai/yui error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi thực thi hành động';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
