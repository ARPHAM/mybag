import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import CalendarEvent from '@/models/CalendarEvent';
import { verifyToken } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { updateType, exceptionDate, ...updateData } = body; 
    // updateType: 'single' (normal event), 'series' (update parent), 'exception' (update one virtual instance)

    if (updateType === 'exception') {
      // Create an exception event that overrides the virtual event on exceptionDate
      const exceptionEvent = await CalendarEvent.create({
        ...updateData,
        user_id: decoded.userId,
        is_recurring: false,
        parent_event_id: id, // id of the parent recurring event
        exception_date: new Date(exceptionDate),
        is_cancelled: updateData.is_cancelled || false
      });
      return NextResponse.json({ message: 'Exception created', event: exceptionEvent });
    } else {
      // Normal or series update
      const updated = await CalendarEvent.findOneAndUpdate(
        { _id: id, user_id: decoded.userId },
        updateData,
        { new: true }
      );
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ message: 'Event updated', event: updated });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const deleteType = searchParams.get('type');
    const exceptionDate = searchParams.get('date');

    if (deleteType === 'exception' && exceptionDate) {
      // Tạm nghỉ (Pause) 1 ngày: tạo exception với cờ is_cancelled = true
      const exceptionEvent = await CalendarEvent.create({
        user_id: decoded.userId,
        title: "Cancelled Exception",
        start_time: new Date(), // doesn't matter much for cancelled
        end_time: new Date(),
        is_recurring: false,
        parent_event_id: id,
        exception_date: new Date(exceptionDate),
        is_cancelled: true
      });
      return NextResponse.json({ message: 'Day paused (Exception created)' });
    } else {
      // Delete the whole series or normal event
      const eventToDel = await CalendarEvent.findOne({ _id: id, user_id: decoded.userId });
      if (!eventToDel) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      if (eventToDel.is_recurring) {
        // If it's a recurring event, we don't delete it physically immediately.
        // We set recurrence_end to now (or yesterday) to stop it from generating future instances.
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        eventToDel.recurrence_end = yesterday;
        await eventToDel.save();
        return NextResponse.json({ message: 'Recurring event stopped' });
      } else {
        // Normal event, delete directly
        await CalendarEvent.findOneAndDelete({ _id: id, user_id: decoded.userId });
        
        // Also delete all exceptions related to this series just in case
        await CalendarEvent.deleteMany({ parent_event_id: id, user_id: decoded.userId });
        return NextResponse.json({ message: 'Event deleted' });
      }
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
