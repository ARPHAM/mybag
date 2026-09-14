import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import CalendarEvent from '@/models/CalendarEvent';
import '@/models/User';
import { verifyToken } from '@/lib/auth';

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

    // 1. Lấy tất cả sự kiện bình thường (không lặp) + ngoại lệ (exceptions) nằm trong khoảng
    const normalAndExceptions = await CalendarEvent.find({
      user_id: decoded.userId,
      is_recurring: false,
      start_time: { $lte: rangeEnd },
      end_time: { $gte: rangeStart }
    }).lean();

    // 2. Lấy tất cả sự kiện lặp lại (có khả năng giao với khoảng đang xem)
    const recurringEvents = await CalendarEvent.find({
      user_id: decoded.userId,
      is_recurring: true,
      start_time: { $lte: rangeEnd },
      $or: [
        { recurrence_end: null },
        { recurrence_end: { $gte: rangeStart } }
      ]
    }).lean();

    // 3. Xử lý sinh các sự kiện ảo từ sự kiện lặp lại
    let generatedEvents: any[] = [];
    for (const recEvent of recurringEvents) {
      // Xác định ngày bắt đầu vòng lặp ảo
      let currentStart = new Date(recEvent.start_time);
      if (currentStart < rangeStart) {
        if (recEvent.recurrence_type === 'YEARLY') {
          const diffYears = rangeStart.getFullYear() - currentStart.getFullYear();
          if (diffYears > 0) {
            currentStart.setFullYear(currentStart.getFullYear() + diffYears);
            if (currentStart < rangeStart) {
              // Ensure it doesn't fall behind rangeStart due to month differences, but usually we just want to start evaluating from the current year of rangeStart.
              // Actually, starting from the year of rangeStart is enough.
            }
          }
        } else {
          // Align by day difference in UTC to avoid DST issues
          const utcStart = Date.UTC(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate());
          const utcRange = Date.UTC(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
          const diffDays = Math.floor((utcRange - utcStart) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            currentStart.setDate(currentStart.getDate() + diffDays);
          }
        }
      }
      
      const eventDuration = new Date(recEvent.end_time).getTime() - new Date(recEvent.start_time).getTime();
      const endLimit = recEvent.recurrence_end && recEvent.recurrence_end < rangeEnd ? recEvent.recurrence_end : rangeEnd;

      // Giới hạn max 100 lần lặp để tránh infinite loop
      let iterations = 0;
      while (currentStart <= endLimit && iterations < 100) {
        let shouldGenerate = false;

        if (recEvent.recurrence_type === 'DAILY') {
          shouldGenerate = true;
        } else if (recEvent.recurrence_type === 'WEEKLY') {
          const dayOfWeek = currentStart.getDay(); // 0 is Sunday
          if (recEvent.recurrence_days?.includes(dayOfWeek)) {
            shouldGenerate = true;
          }
        } else if (recEvent.recurrence_type === 'YEARLY') {
          shouldGenerate = true;
        }

        if (shouldGenerate && currentStart >= recEvent.start_time) {
          const currentEnd = new Date(currentStart.getTime() + eventDuration);
          
          // Chỉ đẩy vào danh sách nếu sự kiện giao với khoảng thời gian đang xem
          if (currentStart <= rangeEnd && currentEnd >= rangeStart) {
            generatedEvents.push({
              ...recEvent,
              _id: `${recEvent._id}_${currentStart.toISOString()}`,
              parent_event_id: recEvent._id,
              start_time: new Date(currentStart),
              end_time: new Date(currentEnd),
              is_virtual: true
            });
          }
        }

        // Increment for next loop
        if (recEvent.recurrence_type === 'YEARLY') {
          currentStart.setFullYear(currentStart.getFullYear() + 1);
        } else {
          currentStart.setDate(currentStart.getDate() + 1);
        }
        
        iterations++;
      }
    }

    // 4. Lọc bỏ các sự kiện ảo bị ghi đè bởi Exceptions
    const exceptionsMap = new Map();
    const resultEvents: any[] = [];

    // Tìm exceptions (có parent_event_id)
    normalAndExceptions.forEach(ev => {
      if (ev.parent_event_id && ev.exception_date) {
        const key = `${ev.parent_event_id}_${new Date(ev.exception_date).toISOString()}`;
        exceptionsMap.set(key, ev);
      } else {
        resultEvents.push(ev);
      }
    });

    // Merge virtual events with exceptions
    generatedEvents.forEach(vEv => {
      const key = `${vEv.parent_event_id}_${new Date(vEv.start_time).toISOString()}`;
      if (exceptionsMap.has(key)) {
        const exEv = exceptionsMap.get(key);
        // Nếu không bị cancel (nghỉ tạm), thì thêm exception vào list
        if (!exEv.is_cancelled) {
          resultEvents.push(exEv);
        }
      } else {
        resultEvents.push(vEv);
      }
    });

    // Sắp xếp
    resultEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // 5. CLEANUP BACKGROUND JOB (Best effort, non-blocking)
    // Clean up events that ended more than 30 days ago to keep DB light.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // We don't await this so it doesn't slow down the response
    CalendarEvent.deleteMany({
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
