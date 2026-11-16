export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const VN_DAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy'
] as const;

export interface VnDateParts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number;
}

function toValidDate(dateInput: Date | string = new Date()): Date {
  const d = typeof dateInput === 'string' ? (parseVnDateTime(dateInput) ?? new Date(dateInput)) : dateInput;
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Trích xuất các thành phần ngày/giờ theo múi giờ Việt Nam (UTC+7, không phụ thuộc TZ hệ thống).
 */
export function getVnParts(dateInput: Date | string = new Date()): VnDateParts {
  const d = toValidDate(dateInput);
  const vnTime = new Date(d.getTime() + VN_OFFSET_MS);
  return {
    year: vnTime.getUTCFullYear(),
    month: vnTime.getUTCMonth() + 1,
    day: vnTime.getUTCDate(),
    hours: vnTime.getUTCHours(),
    minutes: vnTime.getUTCMinutes(),
    seconds: vnTime.getUTCSeconds(),
    dayOfWeek: vnTime.getUTCDay()
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Trả về chuỗi YYYY-MM-DD theo múi giờ Việt Nam (UTC+7).
 */
export function getVnDateStr(dateInput: Date | string = new Date()): string {
  const p = getVnParts(dateInput);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/**
 * Trả về chuỗi "YYYY-MM-DD HH:mm" theo giờ Việt Nam (24h).
 */
export function formatVnClockString(dateInput: Date | string = new Date()): string {
  const p = getVnParts(dateInput);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hours)}:${pad2(p.minutes)}`;
}

/**
 * Trả về chuỗi ISO 8601 có múi giờ Việt Nam tường minh: "YYYY-MM-DDTHH:mm:ss+07:00".
 */
export function formatVnIsoString(dateInput: Date | string = new Date()): string {
  const p = getVnParts(dateInput);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hours)}:${pad2(p.minutes)}:${pad2(p.seconds)}+07:00`;
}

/**
 * Trả về "Thứ X, DD/MM/YYYY" theo giờ Việt Nam.
 */
export function formatVnDisplayDate(dateInput: Date | string): string {
  const p = getVnParts(dateInput);
  return `${VN_DAYS[p.dayOfWeek]}, ${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

/**
 * Trả về "DD/MM/YYYY" theo giờ Việt Nam.
 */
export function formatVnDisplayDateShort(dateInput: Date | string): string {
  const p = getVnParts(dateInput);
  return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

/**
 * Trả về "HH:mm" theo giờ Việt Nam.
 */
export function formatVnDisplayTime(dateInput: Date | string): string {
  const p = getVnParts(dateInput);
  return `${pad2(p.hours)}:${pad2(p.minutes)}`;
}

/**
 * Trả về "Thứ X, DD/MM/YYYY · HH:mm" theo giờ Việt Nam.
 */
export function formatVnDisplayDateTime(dateInput: Date | string): string {
  const p = getVnParts(dateInput);
  return `${VN_DAYS[p.dayOfWeek]}, ${pad2(p.day)}/${pad2(p.month)}/${p.year} · ${pad2(p.hours)}:${pad2(p.minutes)}`;
}

/**
 * Phân tích chuỗi ngày/giờ đầu vào một cách an toàn theo chuẩn giờ Việt Nam (+07:00):
 * - Chuỗi có múi giờ tường minh (Z hoặc ±HH:MM / ±HHMM): giữ nguyên múi giờ đó.
 * - Chuỗi không có múi giờ ("YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm:ss", "DD/MM/YYYY HH:mm"):
 *   MẶC ĐỊNH hiểu là giờ Việt Nam (+07:00), tuyệt đối không rơi về TZ hệ thống (UTC).
 * - Chuỗi chỉ có ngày ("YYYY-MM-DD", "DD/MM/YYYY"): gắn giờ mặc định (mặc định 12:00:00) theo +07:00.
 */
export function parseVnDateTime(input: unknown, defaultTime: string = '12:00:00'): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // 1. Chỉ có ngày: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T${defaultTime}+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. Định dạng Việt Nam: DD/MM/YYYY [HH:mm[:ss]]
  const vnSlashMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (vnSlashMatch) {
    const [, dd, mm, yyyy, hh, min, sec] = vnSlashMatch;
    const dateStr = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    const timeStr = hh
      ? `${hh.padStart(2, '0')}:${min}:${(sec || '00').padStart(2, '0')}`
      : defaultTime;
    const d = new Date(`${dateStr}T${timeStr}+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. YYYY-MM-DD[T ]H:mm[:ss[.sss]] KHÔNG có hậu tố múi giờ -> ép +07:00
  const naiveIsoMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
  );
  if (naiveIsoMatch) {
    const [, datePart, hh, min, sec] = naiveIsoMatch;
    const d = new Date(`${datePart}T${hh.padStart(2, '0')}:${min}:${(sec || '00').padStart(2, '0')}+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // 4. Chuỗi có múi giờ (Z hoặc +07:00 hoặc +0700)
  const normalizedTz = raw
    .replace(/\s+/, 'T')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const parsed = new Date(normalizedTz);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Chuẩn hóa giá trị thời gian bất kỳ về chuỗi ISO giờ Việt Nam (+07:00).
 */
export function normalizeToVnIso(
  input: unknown,
  fallback?: Date,
  defaultTime: string = '12:00:00'
): string | undefined {
  const parsed = parseVnDateTime(input, defaultTime) ?? fallback ?? null;
  if (!parsed || isNaN(parsed.getTime())) return undefined;
  return formatVnIsoString(parsed);
}

/**
 * Chuyển giá trị thời gian về chuỗi "YYYY-MM-DDTHH:mm" theo giờ Việt Nam (+07:00)
 * để binding vào <input type="datetime-local"> không phụ thuộc TZ trình duyệt.
 */
export function toVnDatetimeLocalValue(input: unknown, fallback: Date = new Date()): string {
  const parsed = parseVnDateTime(input, '12:00:00') ?? fallback;
  const p = getVnParts(parsed);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hours)}:${pad2(p.minutes)}`;
}

/**
 * Chuyển chuỗi từ <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") sang chuẩn ISO giờ Việt Nam (+07:00).
 */
export function fromVnDatetimeLocalValue(val: string): string | undefined {
  if (!val || !val.trim()) return undefined;
  return normalizeToVnIso(val.trim(), undefined, '12:00:00');
}

export interface YuiActionScheduleInput {
  actionType?: string;
  custom_time?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  due_date?: unknown;
  expiryDate?: unknown;
  exception_date?: unknown;
  recurrence_end?: unknown;
  month?: unknown;
}

export interface YuiActionScheduleDisplay {
  label: string;
  value: string;
  expiry?: string;
}

/**
 * Tạo nhãn ngày/giờ hiển thị thống nhất trên UI xác nhận của Yui & Smart Command.
 */
export function getYuiActionScheduleDisplay(
  action: YuiActionScheduleInput | null | undefined,
  fallbackTime: Date | string = new Date()
): YuiActionScheduleDisplay | null {
  if (!action || !action.actionType) return null;
  const fallback = toValidDate(fallbackTime);

  switch (action.actionType) {
    case 'create_calendar_event': {
      const start = parseVnDateTime(action.start_time, '09:00:00') ?? fallback;
      let end = parseVnDateTime(action.end_time, '10:00:00');
      if (!end || end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      const sameDay = getVnDateStr(start) === getVnDateStr(end);
      return {
        label: 'Lịch hẹn',
        value: sameDay
          ? `${formatVnDisplayDate(start)} · ${formatVnDisplayTime(start)} - ${formatVnDisplayTime(end)}`
          : `${formatVnDisplayDateShort(start)} ${formatVnDisplayTime(start)} → ${formatVnDisplayDateShort(end)} ${formatVnDisplayTime(end)}`
      };
    }

    case 'update_calendar_event': {
      if (action.start_time) {
        const start = parseVnDateTime(action.start_time, '09:00:00') ?? fallback;
        const end = action.end_time ? parseVnDateTime(action.end_time, '10:00:00') : null;
        if (end && end.getTime() > start.getTime()) {
          const sameDay = getVnDateStr(start) === getVnDateStr(end);
          return {
            label: 'Lịch mới',
            value: sameDay
              ? `${formatVnDisplayDate(start)} · ${formatVnDisplayTime(start)} - ${formatVnDisplayTime(end)}`
              : `${formatVnDisplayDateShort(start)} ${formatVnDisplayTime(start)} → ${formatVnDisplayDateShort(end)} ${formatVnDisplayTime(end)}`
          };
        }
        return {
          label: 'Lịch mới',
          value: formatVnDisplayDateTime(start)
        };
      }
      if (action.exception_date) {
        const ex = parseVnDateTime(action.exception_date, '09:00:00');
        if (ex) {
          return {
            label: 'Buổi áp dụng',
            value: formatVnDisplayDateTime(ex)
          };
        }
      }
      return null;
    }

    case 'delete_calendar_event': {
      const target = action.exception_date || action.start_time;
      if (target) {
        const dt = parseVnDateTime(target, '09:00:00');
        if (dt) {
          return {
            label: 'Buổi hủy',
            value: formatVnDisplayDateTime(dt)
          };
        }
      }
      return null;
    }

    case 'create_task': {
      const defaultDue = new Date(fallback.getTime() + 24 * 60 * 60 * 1000);
      const due = parseVnDateTime(action.due_date, '23:59:00') ?? defaultDue;
      return {
        label: 'Hạn chót',
        value: formatVnDisplayDateTime(due)
      };
    }

    case 'update_task': {
      if (action.due_date) {
        const due = parseVnDateTime(action.due_date, '23:59:00');
        if (due) {
          return {
            label: 'Hạn mới',
            value: formatVnDisplayDateTime(due)
          };
        }
      }
      if (action.custom_time) {
        const dt = parseVnDateTime(action.custom_time, '12:00:00');
        if (dt) {
          return {
            label: 'Thời gian',
            value: formatVnDisplayDateTime(dt)
          };
        }
      }
      return null;
    }

    case 'create_inventory':
    case 'purchase_shopping': {
      const purchase = parseVnDateTime(action.custom_time, '12:00:00') ?? fallback;
      const expiry = action.expiryDate ? parseVnDateTime(action.expiryDate, '12:00:00') : null;
      return {
        label: action.actionType === 'purchase_shopping' ? 'Ngày mua' : 'Ngày nhập',
        value: formatVnDisplayDateTime(purchase),
        ...(expiry ? { expiry: formatVnDisplayDateShort(expiry) } : {})
      };
    }

    case 'update_inventory': {
      const dt = parseVnDateTime(action.custom_time, '12:00:00') ?? fallback;
      const expiry = action.expiryDate ? parseVnDateTime(action.expiryDate, '12:00:00') : null;
      return {
        label: 'Cập nhật',
        value: formatVnDisplayDateTime(dt),
        ...(expiry ? { expiry: formatVnDisplayDateShort(expiry) } : {})
      };
    }

    case 'complete_task': {
      const doneAt = parseVnDateTime(action.custom_time, '12:00:00') ?? fallback;
      return {
        label: 'Hoàn thành',
        value: formatVnDisplayDateTime(doneAt)
      };
    }

    case 'upsert_budget': {
      const monthStr = typeof action.month === 'string' && /^\d{4}-\d{2}$/.test(action.month)
        ? action.month
        : getVnDateStr(fallback).slice(0, 7);
      const [y, m] = monthStr.split('-');
      return {
        label: 'Tháng',
        value: `${m}/${y}`
      };
    }

    case 'update_transaction': {
      if (!action.custom_time) return null;
      const dt = parseVnDateTime(action.custom_time, '12:00:00');
      if (!dt) return null;
      return {
        label: 'Thời gian mới',
        value: formatVnDisplayDateTime(dt)
      };
    }

    case 'meal':
    case 'expense':
    case 'income':
    case 'transfer':
    case 'debt_lent':
    case 'debt_borrowed':
    case 'pay_debt':
    case 'record_weight': {
      const dt = parseVnDateTime(action.custom_time, '12:00:00') ?? fallback;
      return {
        label: 'Thời gian',
        value: formatVnDisplayDateTime(dt)
      };
    }

    case 'delete_task':
    case 'delete_transaction': {
      if (!action.custom_time) return null;
      const dt = parseVnDateTime(action.custom_time, '12:00:00');
      if (!dt) return null;
      return {
        label: 'Thời gian',
        value: formatVnDisplayDateTime(dt)
      };
    }

    case 'create_shopping_item':
    case 'create_recipe': {
      const dt = parseVnDateTime(action.custom_time, '12:00:00') ?? fallback;
      return {
        label: 'Ngày ghi',
        value: formatVnDisplayDate(dt)
      };
    }

    default:
      return null;
  }
}
