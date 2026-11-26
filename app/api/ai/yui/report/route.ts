import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import YuiReport from '@/models/YuiReport';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    const body = await req.json();
    const { user_message, yui_reply, suggested_actions, expected_behavior, context_snapshot } = body;

    if (!user_message || typeof user_message !== 'string') {
      return NextResponse.json({ error: 'Thiếu nội dung câu nói của người dùng' }, { status: 400 });
    }

    if (!expected_behavior || typeof expected_behavior !== 'string' || !expected_behavior.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập mong muốn xử lý thực sự' }, { status: 400 });
    }

    const report = await YuiReport.create({
      user_id: decoded.userId,
      user_message: user_message.trim(),
      yui_reply: typeof yui_reply === 'string' ? yui_reply : '',
      suggested_actions: Array.isArray(suggested_actions) ? suggested_actions : [],
      expected_behavior: expected_behavior.trim(),
      context_snapshot: context_snapshot || null,
      status: 'pending'
    });

    return NextResponse.json({
      success: true,
      message: 'Đã lưu báo cáo huấn luyện Yui thành công!',
      data: report
    });
  } catch (error: any) {
    console.error('Yui Report POST error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const query: any = { user_id: decoded.userId };
    if (status !== 'all') {
      query.status = status;
    }

    const reports = await YuiReport.find(query).sort({ createdAt: -1 }).limit(50);

    return NextResponse.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error: any) {
    console.error('Yui Report GET error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
