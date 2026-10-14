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


    // 5. CLEANUP BACKGROUND JOB (Best effort, non-blocking)
    // Clean up events that ended more than 30 days ago to keep DB light.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // We don't await this so it doesn't slow down the response
    CalendarEvent.deleteMany({
      user_id: decoded.userId,
      $or: [
        { is_recurring: true, recurrence_end: { $lt: thirtyDaysAgo } },
        { is_recurring: false, end_time: { $lt: thirtyDaysAgo } }
      ]
    }).catch(err => console.error("Cleanup failed:", err));

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

    if (!title || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newEvent = await CalendarEvent.create({
      user_id: decoded.userId,
      title,
      description,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      color_code: color_code || '#f97316',
      is_recurring: is_recurring || false,
      recurrence_type,
      recurrence_days,
      recurrence_end: recurrence_end ? new Date(recurrence_end) : undefined
    });

    return NextResponse.json({ message: 'Event created', event: newEvent }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
