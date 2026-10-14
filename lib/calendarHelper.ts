import CalendarEvent from '@/models/CalendarEvent';
import mongoose from 'mongoose';

/**
 * Tính thứ trong tuần theo múi giờ Việt Nam (Asia/Ho_Chi_Minh: UTC+7)
 * 0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy (khớp với convention getDay() của JavaScript)
 */
export function getVnDayOfWeek(date: Date): number {
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.getUTCDay();
}

/**
 * Trả về chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (UTC+7)
 */
export function getVnDateKey(date: Date | string): string {
  const d = new Date(date);
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const y = vnTime.getUTCFullYear();
  const m = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const dNum = String(vnTime.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dNum}`;
}

/**
 * Trả về chuỗi đầy đủ: "Thứ X, ngày DD/MM/YYYY lúc HH:mm" theo giờ Việt Nam (UTC+7)
 */
export function formatVnDateTime(date: Date | string): string {
  const d = new Date(date);
  const vnDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const dayName = vnDays[vnTime.getUTCDay()];
  const day = String(vnTime.getUTCDate()).padStart(2, '0');
  const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const year = vnTime.getUTCFullYear();
  const hours = String(vnTime.getUTCHours()).padStart(2, '0');
  const minutes = String(vnTime.getUTCMinutes()).padStart(2, '0');
  return `${dayName}, ngày ${day}/${month}/${year} lúc ${hours}:${minutes}`;
}

/**
 * Trả về chuỗi Thứ và Ngày: "Thứ X, ngày DD/MM/YYYY" theo giờ Việt Nam (UTC+7)
 */
export function formatVnDateOnly(date: Date | string): string {
  const d = new Date(date);
  const vnDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const dayName = vnDays[vnTime.getUTCDay()];
  const day = String(vnTime.getUTCDate()).padStart(2, '0');
  const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const year = vnTime.getUTCFullYear();
  return `${dayName}, ngày ${day}/${month}/${year}`;
}


/**
 * Mở rộng tất cả sự kiện (bao gồm sự kiện một lần và các biến thể ảo của sự kiện lặp lại)
 * trong khoảng [rangeStart, rangeEnd] cho một user cụ thể.
 * Tính toán chuẩn theo múi giờ Việt Nam (Asia/Ho_Chi_Minh: UTC+7), hoàn toàn không bị lệch ngày bởi server timezone.
 */
export async function getExpandedCalendarEvents(
  userId: string | mongoose.Types.ObjectId,
  rangeStart: Date,
  rangeEnd: Date
) {
  // 1. Lấy tất cả sự kiện bình thường (không lặp) + ngoại lệ (exceptions) nằm trong khoảng
  const normalAndExceptions = await CalendarEvent.find({
    user_id: userId,
    is_recurring: false,
    start_time: { $lte: rangeEnd },
    end_time: { $gte: rangeStart }
  }).lean();

  // 2. Lấy tất cả sự kiện lặp lại có khả năng xuất hiện trong khoảng đang xem
  const recurringEvents = await CalendarEvent.find({
    user_id: userId,
    is_recurring: true,
    start_time: { $lte: rangeEnd },
    $or: [
      { recurrence_end: null },
      { recurrence_end: { $gte: rangeStart } }
    ]
  }).lean();

  const generatedEvents: any[] = [];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const recEvent of (recurringEvents as any[])) {
    const recStart = new Date(recEvent.start_time);
    const recEnd = new Date(recEvent.end_time);
    const eventDuration = recEnd.getTime() - recStart.getTime();

    // Giới hạn ngày kết thúc của chuỗi lặp
    const endLimitTime = recEvent.recurrence_end && new Date(recEvent.recurrence_end) < rangeEnd
      ? new Date(recEvent.recurrence_end).getTime()
      : rangeEnd.getTime();

    const recurrenceType = recEvent.recurrence_type || 'WEEKLY';

    if (recurrenceType === 'DAILY' || recurrenceType === 'WEEKLY') {
      let activeDays: number[] = [];
      if (recurrenceType === 'DAILY') {
        activeDays = [0, 1, 2, 3, 4, 5, 6];
      } else {
        activeDays = Array.isArray(recEvent.recurrence_days) && recEvent.recurrence_days.length > 0
          ? recEvent.recurrence_days
          : [getVnDayOfWeek(recStart)];
      }

      // Nhảy nhanh k ngày để đưa curStartTime về sát khoảng [rangeStart - eventDuration]
      let k = Math.floor((rangeStart.getTime() - eventDuration - recStart.getTime()) / ONE_DAY_MS);
      if (k < 0) k = 0;

      let curStartTime = recStart.getTime() + k * ONE_DAY_MS;
      let iterations = 0;

      while (curStartTime <= endLimitTime && iterations < 500) {
        const curStart = new Date(curStartTime);
        const curEnd = new Date(curStartTime + eventDuration);

        // Kiểm tra xem occurrence này có rơi vào thứ hợp lệ theo múi giờ Việt Nam không
        const dayOfWeek = getVnDayOfWeek(curStart);
        if (activeDays.includes(dayOfWeek) && curStartTime >= recStart.getTime()) {
          // Giao với khoảng rangeStart..rangeEnd
          if (curStartTime <= rangeEnd.getTime() && curEnd.getTime() >= rangeStart.getTime()) {
            generatedEvents.push({
              ...recEvent,
              _id: `${recEvent._id.toString()}_${curStart.toISOString()}`,
              parent_event_id: recEvent._id,
              start_time: curStart,
              end_time: curEnd,
              is_virtual: true
            });
          }
        }

        curStartTime += ONE_DAY_MS;
        iterations++;
      }
    } else if (recurrenceType === 'MONTHLY') {
      // Lặp hàng tháng vào cùng ngày trong tháng theo múi giờ Việt Nam
      const baseVn = new Date(recStart.getTime() + 7 * 60 * 60 * 1000);
      const targetDay = baseVn.getUTCDate();
      const targetH = baseVn.getUTCHours();
      const targetM = baseVn.getUTCMinutes();
      const targetS = baseVn.getUTCSeconds();

      const startVn = new Date(rangeStart.getTime() + 7 * 60 * 60 * 1000);
      const endVn = new Date(rangeEnd.getTime() + 7 * 60 * 60 * 1000);

      let curYear = startVn.getUTCFullYear();
      let curMonth = startVn.getUTCMonth();
      const endYear = endVn.getUTCFullYear();
      const endMonth = endVn.getUTCMonth();

      while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
        const daysInMonth = new Date(Date.UTC(curYear, curMonth + 1, 0)).getUTCDate();
        const actualDay = Math.min(targetDay, daysInMonth);
        const vnUtcTime = Date.UTC(curYear, curMonth, actualDay, targetH, targetM, targetS);
        const occurrenceStart = new Date(vnUtcTime - 7 * 60 * 60 * 1000);
        const occurrenceEnd = new Date(occurrenceStart.getTime() + eventDuration);

        if (
          occurrenceStart.getTime() >= recStart.getTime() &&
          occurrenceStart.getTime() <= endLimitTime &&
          occurrenceStart.getTime() <= rangeEnd.getTime() &&
          occurrenceEnd.getTime() >= rangeStart.getTime()
        ) {
          generatedEvents.push({
            ...recEvent,
            _id: `${recEvent._id.toString()}_${occurrenceStart.toISOString()}`,
            parent_event_id: recEvent._id,
            start_time: occurrenceStart,
            end_time: occurrenceEnd,
            is_virtual: true
          });
        }

        curMonth++;
        if (curMonth > 11) {
          curMonth = 0;
          curYear++;
        }
      }
    } else if (recurrenceType === 'YEARLY') {
      // Lặp hàng năm vào cùng ngày & tháng theo múi giờ Việt Nam
      const baseVn = new Date(recStart.getTime() + 7 * 60 * 60 * 1000);
      const targetMonth = baseVn.getUTCMonth();
      const targetDay = baseVn.getUTCDate();
      const targetH = baseVn.getUTCHours();
      const targetM = baseVn.getUTCMinutes();
      const targetS = baseVn.getUTCSeconds();

      const startVn = new Date(rangeStart.getTime() + 7 * 60 * 60 * 1000);
      const endVn = new Date(rangeEnd.getTime() + 7 * 60 * 60 * 1000);

      for (let y = startVn.getUTCFullYear(); y <= endVn.getUTCFullYear(); y++) {
        const daysInMonth = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
        const actualDay = Math.min(targetDay, daysInMonth);
        const vnUtcTime = Date.UTC(y, targetMonth, actualDay, targetH, targetM, targetS);
        const occurrenceStart = new Date(vnUtcTime - 7 * 60 * 60 * 1000);
        const occurrenceEnd = new Date(occurrenceStart.getTime() + eventDuration);

        if (
          occurrenceStart.getTime() >= recStart.getTime() &&
          occurrenceStart.getTime() <= endLimitTime &&
          occurrenceStart.getTime() <= rangeEnd.getTime() &&
          occurrenceEnd.getTime() >= rangeStart.getTime()
        ) {
          generatedEvents.push({
            ...recEvent,
            _id: `${recEvent._id.toString()}_${occurrenceStart.toISOString()}`,
            parent_event_id: recEvent._id,
            start_time: occurrenceStart,
            end_time: occurrenceEnd,
            is_virtual: true
          });
        }
      }
    }
  }

  // 4. Lọc bỏ các sự kiện ảo bị ghi đè bởi Exceptions
  const exceptionsMap = new Map<string, any>();
  const resultEvents: any[] = [];

  // Tìm exceptions (có parent_event_id)
  (normalAndExceptions as any[]).forEach(ev => {
    if (ev.parent_event_id && ev.exception_date) {
      const key = `${ev.parent_event_id.toString()}_${new Date(ev.exception_date).toISOString()}`;
      exceptionsMap.set(key, ev);
    } else {
      resultEvents.push(ev);
    }
  });

  // Merge virtual events with exceptions
  generatedEvents.forEach(vEv => {
    const parentId = vEv.parent_event_id?.toString() || vEv.parent_event_id;
    const key = `${parentId}_${new Date(vEv.start_time).toISOString()}`;
    if (exceptionsMap.has(key)) {
      const exEv = exceptionsMap.get(key);
      if (!exEv.is_cancelled) {
        resultEvents.push(exEv);
      }
    } else {
      resultEvents.push(vEv);
    }
  });

  // Sắp xếp theo thứ tự thời gian bắt đầu
  resultEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return resultEvents;
}
