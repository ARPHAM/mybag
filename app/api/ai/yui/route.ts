import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { parseYuiRequest, getYuiProactiveBriefing } from '@/lib/yuiEngine';
import { getRequestNow } from '@/lib/simClock';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId(): Promise<string | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = await verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
  return decoded.userId;
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserId();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') === 'en' ? 'en' : 'vi';

    const briefing = await getYuiProactiveBriefing(auth, lang, getRequestNow(req));
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
    const { text, history, imageData, lang } = body;

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
      hasValidImage ? imageData : undefined,
      lang === 'en' ? 'en' : 'vi',
      getRequestNow(req)
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


