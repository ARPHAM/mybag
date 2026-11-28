import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import CalendarEvent from '@/models/CalendarEvent';
import '@/models/User';
import { verifyToken } from '@/lib/auth';
import { getExpandedCalendarEvents } from '@/lib/calendarHelper';

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
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    if (!startStr || !endStr) {
      return NextResponse.json({ error: 'Start and end are required' }, { status: 400 });
    }

    const rangeStart = new Date(startStr);
    const rangeEnd = new Date(endStr);

    // Sử dụng helper dùng chung để mở rộng sự kiện & sự kiện lặp theo chuẩn múi giờ Việt Nam
    const resultEvents = await getExpandedCalendarEvents(decoded.userId, rangeStart, rangeEnd);

    // Lưu ý: Dữ liệu sự kiện lịch sử của người dùng được bảo tồn vĩnh viễn, không xóa tự động
    return NextResponse.json(resultEvents);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

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
    const { title, description, start_time, end_time, color_code, is_recurring, recurrence_type, recurrence_days, recurrence_end } = body;

    const titleStr = typeof title === 'string' ? title.trim() : '';
    if (!titleStr || titleStr.length > 200) {
      return NextResponse.json({ error: 'Tiêu đề sự kiện không hợp lệ (1-200 ký tự)' }, { status: 400 });
    }

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'Vui lòng chọn thời gian bắt đầu và kết thúc' }, { status: 400 });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Thời gian không hợp lệ' }, { status: 400 });
    }

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'Thời gian kết thúc phải sau thời gian bắt đầu' }, { status: 400 });
    }

    if (is_recurring && recurrence_type && !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(recurrence_type)) {
      return NextResponse.json({ error: 'Kiểu lặp lại không hợp lệ' }, { status: 400 });
    }

    const resolvedRecurrenceEnd = recurrence_end
      ? (/^\d{4}-\d{2}-\d{2}$/.test(String(recurrence_end).trim())
        ? new Date(`${String(recurrence_end).trim()}T23:59:59.999+07:00`)
        : new Date(recurrence_end))
      : undefined;

    const newEvent = await CalendarEvent.create({
      user_id: decoded.userId,
      title: titleStr,
      description: typeof description === 'string' ? description.trim() : '',
      start_time: startDate,
      end_time: endDate,
      color_code: color_code || '#f97316',
      is_recurring: is_recurring || false,
      recurrence_type,
      recurrence_days: Array.isArray(recurrence_days) ? recurrence_days : [],
      recurrence_end: resolvedRecurrenceEnd
    });

    return NextResponse.json({ message: 'Event created', event: newEvent }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
