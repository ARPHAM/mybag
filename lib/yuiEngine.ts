import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import Debt from '@/models/Debt';
import Budget from '@/models/Budget';
import Inventory from '@/models/Inventory';
import Task from '@/models/Task';
import CalendarEvent from '@/models/CalendarEvent';
import MealLog from '@/models/MealLog';
import ShoppingItem from '@/models/ShoppingItem';
import WeightLog from '@/models/WeightLog';
import Recipe from '@/models/Recipe';
import HealthAnalysis from '@/models/HealthAnalysis';
import { generateContentWithFallback } from '@/lib/ai';
import { getExpandedCalendarEvents, formatVnDateTime, formatVnDateOnly, getVnDayOfWeek } from '@/lib/calendarHelper';
import {
  formatVnClockString,
  formatVnDisplayTime,
  formatVnIsoString,
  getVnDateStr,
  parseVnDateTime,
  normalizeToVnIso
} from '@/lib/vnTime';

const FINANCE_CATEGORY_DEFAULT_NAMES: Record<string, string> = {
  food: 'Ăn uống',
  housing: 'Nhà cửa & Sinh hoạt',
  transport: 'Đi lại',
  entertainment: 'Giải trí',
  shopping: 'Mua sắm',
  health: 'Sức khoẻ',
  other: 'Khác'
};

const EXP_REWARDS: Record<string, number> = {
  S: 1000,
  A: 600,
  B: 300,
  C: 150,
  D: 50,
};

const getExpForNextLevel = (level: number) => level * 500;

/**
 * Loại bỏ triệt để các từ ngữ chỉ thời gian tương đối khỏi tên món ăn, tiêu đề, mô tả
 * để tránh việc lưu vào DB bị outdate (ví dụ: "Bánh mì sáng nay" -> "Bánh mì").
 */
export function cleanTemporalWords(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b(sáng|trưa|chiều|tối|đêm)\s+(nay|qua|kia|hôm nay|hôm qua)\b/gi, '')
    .replace(/\b(hôm nay|hôm qua|hôm kia|ngày mai|chiều mai|sáng mai|tối mai)\b/gi, '')
    .replace(/\b(vừa ăn|vừa uống|mới ăn|mới uống|vừa mới|vừa mua|mới mua|vừa xong|mới xong|hồi nãy|lúc nãy)\b/gi, '')
    .replace(/\b(buổi\s+(sáng|trưa|chiều|tối|đêm))\b/gi, '')
    .replace(/\b(bữa\s+(sáng|trưa|tối|đêm))\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Hàm trích xuất JSON an toàn tuyệt đối từ phản hồi của LLM:
 * - Hỗ trợ cả Object {...} và Array [...]
 * - Xử lý trailing commas
 * - Fallback trả về object hội thoại chuẩn nếu AI trả lời dạng text tự nhiên (không bao giờ quăng lỗi làm sập giao diện).
 */
export function extractJsonFromAiResponse(raw: string): any {
  if (!raw || typeof raw !== 'string') {
    return {
      summary: 'Yui trả lời',
      reply: 'Dạ Yui đây ạ! Papa cần Yui hỗ trợ gì thế ạ?',
      actions: []
    };
  }

  const cleaned = raw.trim();

  const tryParse = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      try {
        // Xóa trailing commas: { a: 1, } hoặc [ 1, ]
        const sanitized = str.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitized);
      } catch {
        return null;
      }
    }
  };

  // 1. Thử parse trực tiếp
  const direct = tryParse(cleaned);
  if (direct) return direct;

  // 2. Thử tìm khối code block ```json ... ``` hoặc ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    const fromBlock = tryParse(codeBlockMatch[1].trim());
    if (fromBlock) return fromBlock;
  }

  // 3. Thử tìm cặp ngoặc nhọn { ... } ngoài cùng
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const fromBrace = tryParse(cleaned.substring(firstBrace, lastBrace + 1));
    if (fromBrace) return fromBrace;
  }

  // 4. Thử tìm cặp ngoặc vuông [ ... ] ngoài cùng (cho router hoặc mảng)
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const fromBracket = tryParse(cleaned.substring(firstBracket, lastBracket + 1));
    if (fromBracket) return fromBracket;
  }

  // 5. Fallback nhân đạo: Nếu model chỉ trả về câu trò chuyện bằng text thuần mà không định dạng JSON
  console.warn("AI returned conversational text instead of strict JSON:", cleaned);
  const cleanReply = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return {
    summary: 'Yui trò chuyện cùng Papa',
    reply: cleanReply,
    actions: []
  };
}

/**
 * Chuẩn hoá chuỗi: loại bỏ toàn bộ dấu thanh/dấu mũ tiếng Việt và đưa về chữ thường.
 * Giúp \b (word boundary) trong JavaScript RegExp hoạt động chính xác 100% cho cả người gõ có dấu và không dấu.
 */
export function normalizeVietnamese(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Bóc tách và tính toán khoảng thời gian theo các biểu thức tự nhiên trong tiếng Việt:
 * Tính toán chuẩn xác theo múi giờ Việt Nam (UTC+7, Asia/Ho_Chi_Minh).
 */
export function resolveVnDateExpression(normalizedText: string, now: Date = new Date()): {
  label: string;
  start: Date;
  end: Date;
} | null {
  const vnFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayVnStr = vnFormatter.format(now); // "YYYY-MM-DD"
  const todayStart = new Date(`${todayVnStr}T00:00:00+07:00`);
  const todayEnd = new Date(`${todayVnStr}T23:59:59.999+07:00`);

  const vnDay = getVnDayOfWeek(todayStart); // 0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy
  const daysSinceMonday = vnDay === 0 ? 6 : vnDay - 1;
  const thisMondayStart = new Date(todayStart.getTime() - daysSinceMonday * 86400000);
  const isNextWeek = /\b(tuan toi|tuan sau)\b/.test(normalizedText);

  // Hôm nay
  if (/\b(hom nay)\b/.test(normalizedText)) {
    return { label: 'Hôm nay', start: todayStart, end: todayEnd };
  }

  // Ngày mai / Mai
  if (/\b(ngay mai|mai)\b/.test(normalizedText)) {
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000 - 1);
    return { label: 'Ngày mai', start: tomorrowStart, end: tomorrowEnd };
  }

  // Ngày kia / Mốt
  if (/\b(ngay kia|mot)\b/.test(normalizedText)) {
    const afterTomorrowStart = new Date(todayStart.getTime() + 2 * 86400000);
    const afterTomorrowEnd = new Date(afterTomorrowStart.getTime() + 86400000 - 1);
    return { label: 'Ngày kia', start: afterTomorrowStart, end: afterTomorrowEnd };
  }

  // Hôm qua
  if (/\b(hom qua)\b/.test(normalizedText)) {
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const yesterdayEnd = new Date(yesterdayStart.getTime() + 86400000 - 1);
    return { label: 'Hôm qua', start: yesterdayStart, end: yesterdayEnd };
  }

  // Cuối tuần
  if (/\b(cuoi tuan)\b/.test(normalizedText)) {
    const baseMonday = isNextWeek ? new Date(thisMondayStart.getTime() + 7 * 86400000) : thisMondayStart;
    const satStart = new Date(baseMonday.getTime() + 5 * 86400000);
    const sunEnd = new Date(baseMonday.getTime() + 7 * 86400000 - 1);
    return { label: isNextWeek ? 'Cuối tuần sau' : 'Cuối tuần này', start: satStart, end: sunEnd };
  }

  // Các thứ trong tuần: Thứ 2 -> Chủ Nhật (vd: "lịch CN tuần này", "thứ 6 tuần tới", "t7")
  const daysConfig: { regex: RegExp; targetDay: number; name: string }[] = [
    { regex: /\b(chu nhat|cn)\b/, targetDay: 0, name: 'Chủ Nhật' },
    { regex: /\b(thu 7|thu bay|t7)\b/, targetDay: 6, name: 'Thứ Bảy' },
    { regex: /\b(thu 6|thu sau|t6)\b/, targetDay: 5, name: 'Thứ Sáu' },
    { regex: /\b(thu 5|thu nam|t5)\b/, targetDay: 4, name: 'Thứ Năm' },
    { regex: /\b(thu 4|thu tu|t4)\b/, targetDay: 3, name: 'Thứ Tư' },
    { regex: /\b(thu 3|thu ba|t3)\b/, targetDay: 2, name: 'Thứ Ba' },
    { regex: /\b(thu 2|thu hai|t2)\b/, targetDay: 1, name: 'Thứ Hai' },
  ];

  for (const item of daysConfig) {
    if (item.regex.test(normalizedText)) {
      const offsetDays = item.targetDay === 0 ? 6 : item.targetDay - 1;
      const baseMonday = isNextWeek ? new Date(thisMondayStart.getTime() + 7 * 86400000) : thisMondayStart;
      const targetStart = new Date(baseMonday.getTime() + offsetDays * 86400000);
      const targetEnd = new Date(targetStart.getTime() + 86400000 - 1);
      const label = `${item.name}${isNextWeek ? ' tuần tới' : ' tuần này'} (${formatVnDateOnly(targetStart)})`;
      return { label, start: targetStart, end: targetEnd };
    }
  }

  // Tuần tới / Tuần sau
  if (/\b(tuan toi|tuan sau)\b/.test(normalizedText)) {
    const nextMon = new Date(thisMondayStart.getTime() + 7 * 86400000);
    const nextSun = new Date(nextMon.getTime() + 7 * 86400000 - 1);
    return { label: 'Tuần tới', start: nextMon, end: nextSun };
  }

  // Tuần này
  if (/\b(tuan nay)\b/.test(normalizedText)) {
    const thisSun = new Date(thisMondayStart.getTime() + 7 * 86400000 - 1);
    return { label: 'Tuần này', start: thisMondayStart, end: thisSun };
  }

  return null;
}

/**
 * Các tham số động truy vấn ngữ cảnh theo nhu cầu thực tế của người dùng
 */
export interface YuiQueryParams {
  calendar?: {
    date_start?: string; // ISO string
    date_end?: string;   // ISO string
    target_date_label?: string; // e.g. "Chủ Nhật tuần này (01/11/2026)"
  };
  meals?: {
    date_start?: string;
    date_end?: string;
    target_date_label?: string; // e.g. "Hôm qua"
  };
  finances?: {
    wallet_keyword?: string; // e.g. "momo", "mb"
    category?: string;       // e.g. "food", "transport"
    debt_person?: string;    // e.g. "Nam"
  };
  inventory_recipes?: {
    recipe_name?: string;     // e.g. "sườn xào"
    need_recipe_instructions?: boolean;
    inventory_keyword?: string;
    only_expiring?: boolean;
  };
  tasks?: {
    status?: 'PENDING' | 'OVERDUE' | 'COMPLETED' | 'ALL_ACTIVE';
    quest_rank?: 'S' | 'A' | 'B' | 'C' | 'D';
  };
}

export interface FastDetectionResult {
  scopes: YuiDataScope[];
  params: YuiQueryParams;
}

/**
 * Nhận diện phạm vi nghiệp vụ siêu tốc kèm tham số động (Fast-Path Scope & Dynamic Parameter Extraction):
 * Chạy trong 0ms, không tốn AI token/quota, bóc tách chính xác ngày, ví, danh mục để BE query đúng mục tiêu.
 */
export function detectFastScopesAndParams(text: string, now: Date = new Date()): FastDetectionResult | null {
  const nt = normalizeVietnamese(text);
  const scopes = new Set<YuiDataScope>();
  const params: YuiQueryParams = {};

  const dateRes = resolveVnDateExpression(nt, now);
  const isEditOrReschedule = /\b(doi|lui|chuyen|sua|xoa|huy|nghi|hoan tac|undo|cap nhat)\b/.test(nt);

  // 1. Lịch trình & Cuộc hẹn (bao gồm dời lịch, hủy/nghỉ 1 buổi, lịch lặp)
  const isCalendarQuery =
    /\b(lich|hen|hop|meeting|su kien|event|thoi gian bieu|ranh|ban|lich trinh|timeline|agenda|doi gio|lui gio|chuyen gio|doi lich|sua lich|xoa lich|huy lich|nghi tap|nghi hoc|buoi tap|buoi hoc|tap gym|yoga|lap lai|dinh ky|hang ngay|hang tuan|moi thu)\b/.test(nt) ||
    (/\b(co viec gi|lam gi|phai lam gi|co gi lam)\b/.test(nt) && dateRes !== null);

  if (isCalendarQuery) {
    scopes.add('calendar');
    // Chỉ khóa khoảng ngày khi hỏi tra cứu; khi dời/sửa/hủy cần thấy rộng hơn để tìm đúng sự kiện
    if (dateRes && !isEditOrReschedule) {
      params.calendar = {
        date_start: dateRes.start.toISOString(),
        date_end: dateRes.end.toISOString(),
        target_date_label: dateRes.label
      };
    }
  }

  // 2. Câu hỏi tổng quan / Tình hình / Báo cáo / Phân tích ("hôm nay có gì", "tình hình hôm nay của Papa?")
  if (/\b(tinh hinh|tong ket|bao cao|nhac nho|canh bao|briefing|hom nay co gi|hom nay the nao|hom nay co viec gi|co viec gi lam)\b/.test(nt)) {
    scopes.add('calendar');
    scopes.add('tasks');
    if (/\b(tinh hinh|tong ket|bao cao|nhac nho|canh bao|briefing|hom nay the nao)\b/.test(nt)) {
      scopes.add('finances');
      scopes.add('meals_nutrition');
      scopes.add('inventory_recipes');
      scopes.add('shopping');
    }
  }

  // 3. Nhiệm vụ & Quests SAO (bao gồm sửa, đổi deadline, chuyển trạng thái, hoàn tác, xóa)
  if (/\b(nhiem vu|quest|task|todo|deadline|han chot|qua han|tre han|hoan thanh|xong viec|can lam|hoan tac|undo|dang lam|bat dau lam|doi han|sua quest|xoa quest|huy quest|xoa nhiem vu|doi deadline)\b/.test(nt)) {
    scopes.add('tasks');
    params.tasks = {};
    if (/\b(qua han|tre han)\b/.test(nt)) {
      params.tasks.status = 'OVERDUE';
    } else if (/\b(hoan thanh|da xong|xong|hoan tac|undo)\b/.test(nt)) {
      params.tasks.status = 'COMPLETED';
    }
    const rankMatch = nt.match(/\brank\s+([sabcd])\b/);
    if (rankMatch) {
      params.tasks.quest_rank = rankMatch[1].toUpperCase() as any;
    }
  }

  // 4. Tài chính & Ví & Sổ nợ & Ngân sách & Giao dịch
  const isFinanceAmount = /\b\d+(?:[.,]\d+)?\s*(k|tr|trieu|nghin|ngan|dong|d|vnd)\b/.test(nt);
  const isFinanceKeyword = /\b(tien|vi|chi|tieu|thu|nap|rut|luong|giao dich|vay|no|muon|tra ho|doi no|tra no|thu no|tra lai|tat toan|hoan tien|thanh toan|ngan sach|han muc|dat han muc|sua han muc|so du|ngan hang|bank|atm|momo|zalopay|vcb|mb|techcombank|tcb|vietcombank|ck|chuyen|chuyen tien|chuyen vi|chuyen khoan|tien mat|hoa don|bill|ton bao nhieu|het bao nhieu|sua giao dich|xoa giao dich|huy giao dich)\b/.test(nt);

  if (isFinanceKeyword || isFinanceAmount) {
    scopes.add('finances');
    params.finances = {};

    if (/\bmomo\b/.test(nt)) params.finances.wallet_keyword = 'momo';
    else if (/\bmb|mb bank\b/.test(nt)) params.finances.wallet_keyword = 'mb';
    else if (/\bvcb|vietcombank\b/.test(nt)) params.finances.wallet_keyword = 'vcb';
    else if (/\btcb|techcombank\b/.test(nt)) params.finances.wallet_keyword = 'techcombank';
    else if (/\btien mat\b/.test(nt)) params.finances.wallet_keyword = 'tiền mặt';

    if (/\b(an uong|an|uong|food)\b/.test(nt)) params.finances.category = 'food';
    else if (/\b(di lai|xang xe|xe|transport)\b/.test(nt)) params.finances.category = 'transport';
    else if (/\b(mua sam|shopping)\b/.test(nt)) params.finances.category = 'shopping';
    else if (/\b(nha cua|tien nha|dien nuoc|sinh hoat|housing)\b/.test(nt)) params.finances.category = 'housing';
    else if (/\b(giai tri|game|phim|entertainment)\b/.test(nt)) params.finances.category = 'entertainment';
    else if (/\b(suc khoe|thuoc|y te|kham|health)\b/.test(nt)) params.finances.category = 'health';
  }

  // 5. Bữa ăn & Dinh dưỡng & Phân tích 7 ngày
  const isMealAction = /\b(an|uong|bua sang|bua trua|bua toi|bua dem|diem tam|lot da|nhau|tu nau)\b/.test(nt);
  const isNutrition = /\b(calo|kcal|protein|carb|fat|chat beo|tinh bot|macro|dinh duong|thoi quen an|phan tich suc khoe)\b/.test(nt);

  if (isMealAction || isNutrition) {
    scopes.add('meals_nutrition');
    if (/\b(phan tich suc khoe|thoi quen an|dinh duong|suc khoe)\b/.test(nt)) {
      scopes.add('weight_health');
    }
    if (isFinanceAmount || /\b(tien|k|vnd|d|dong)\b/.test(nt)) {
      scopes.add('finances');
    }
    if (/\b(tu nau|tai nha|o nha|trong tu|trong kho|tu lanh)\b/.test(nt)) {
      scopes.add('inventory_recipes');
    }
    if (dateRes && !isEditOrReschedule && !/\b(tuan|7 ngay|thang|xu huong|phan tich)\b/.test(nt)) {
      params.meals = {
        date_start: dateRes.start.toISOString(),
        date_end: dateRes.end.toISOString(),
        target_date_label: dateRes.label
      };
    }
  }

  // 6. Kho đồ tủ lạnh & Công thức nấu ăn
  const isStorage = /\b(tu lanh|kho|nguyen lieu|thuc pham|gia vi|ton kho|het han|bao quan|cat vao tu|cat tu|nhap kho|trong tu|tu do|dung het|xai het|bo di|vut|hong|thiu|cap nhat kho|sua kho)\b/.test(nt);
  const isCooking = /\b(cong thuc|nau|tu nau|che bien|cach lam|huong dan|lam mon|mon gi|nau gi|thuc don|menu)\b/.test(nt);

  if (isStorage || isCooking) {
    scopes.add('inventory_recipes');
    params.inventory_recipes = {};

    if (/\b(het han|sap het han)\b/.test(nt)) {
      params.inventory_recipes.only_expiring = true;
    }

    if (/\b(cach lam|cach nau|huong dan|cong thuc)\b/.test(nt)) {
      params.inventory_recipes.need_recipe_instructions = true;
      const dishMatch = text.match(/(?:cách nấu|cách làm|công thức|hướng dẫn nấu|hướng dẫn làm)\s+(?:món\s+)?([A-Za-zÀ-ỹ0-9\s]{2,25})/i);
      if (dishMatch) {
        params.inventory_recipes.recipe_name = dishMatch[1].trim();
      }
    }
  }

  // 7. Cân nặng & Sức khỏe
  if (/\b(can nang|can|kg|kilo|chieu cao|cm|suc khoe|bmi|nang bao nhieu)\b/.test(nt)) {
    scopes.add('weight_health');
  }

  // 8. Danh sách mua sắm & Checkout vào kho
  if (/\b(mua sam|shopping|di cho|sieu thi|danh sach mua|can mua|mua xong|da mua|tick|gach|xong mon)\b/.test(nt)) {
    scopes.add('shopping');
    if (/\b(mua xong|da mua|di cho|sieu thi|cat tu|cat vao tu|nhap kho)\b/.test(nt)) {
      scopes.add('inventory_recipes');
    }
  }

  // 9. Trò chuyện thông thường / Chào hỏi
  if (
    scopes.size === 0 &&
    /\b(chao|hi|hello|yui|cam on|thanks|tam biet|em la ai|ban la ai)\b/.test(nt)
  ) {
    scopes.add('general_chat');
  }

  if (scopes.size > 0) {
    return {
      scopes: Array.from(scopes),
      params
    };
  }

  return null;
}

/**
 * Hàm tương thích ngược nhận diện scopes
 */
export function detectFastScopes(text: string): YuiDataScope[] | null {
  const res = detectFastScopesAndParams(text);
  return res ? res.scopes : null;
}

/**
 * Thu thập toàn bộ ngữ cảnh hệ thống của riêng User hiện tại (tuyệt đối không lấy của user khác).
 */
export type YuiDataScope =
  | 'calendar'
  | 'tasks'
  | 'finances'
  | 'inventory_recipes'
  | 'meals_nutrition'
  | 'weight_health'
  | 'shopping'
  | 'general_chat'
  | 'all';

/**
 * Thu thập ngữ cảnh hệ thống có chọn lọc và động theo scopes & params của riêng User hiện tại.
 * Truy vấn đúng mục tiêu (targeted drill-down), nén dữ liệu trước khi gửi để tiết kiệm 80% token.
 */
function computeVnPeriodBounds(now: Date = new Date()) {
  const todayVnStr = getVnDateStr(now); // "YYYY-MM-DD"
  const [vnYearStr, vnMonthStr] = todayVnStr.split('-');
  const vnYear = Number(vnYearStr);
  const vnMonth = Number(vnMonthStr);
  const currentMonthStr = `${vnYearStr}-${vnMonthStr}`;
  const prevMonthYear = vnMonth === 1 ? vnYear - 1 : vnYear;
  const prevMonthNum = vnMonth === 1 ? 12 : vnMonth - 1;
  const prevMonthStr = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}`;

  const monthStart = new Date(`${currentMonthStr}-01T00:00:00+07:00`);
  const prevMonthStart = new Date(`${prevMonthStr}-01T00:00:00+07:00`);
  const todayStart = new Date(`${todayVnStr}T00:00:00+07:00`);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const todayEnd = new Date(`${todayVnStr}T23:59:59.999+07:00`);

  const vnDay = getVnDayOfWeek(todayStart);
  const daysSinceMonday = vnDay === 0 ? 6 : vnDay - 1;
  const daysUntilSunday = vnDay === 0 ? 0 : 7 - vnDay;

  const thisMondayStart = new Date(todayStart.getTime() - daysSinceMonday * 86400000);
  const thisSundayEnd = new Date(todayStart.getTime() + (daysUntilSunday + 1) * 86400000 - 1);
  const prevWeekStart = new Date(thisMondayStart.getTime() - 7 * 86400000);
  const nextMondayStart = new Date(thisSundayEnd.getTime() + 1);
  const nextSundayEnd = new Date(nextMondayStart.getTime() + 7 * 86400000 - 1);
  const sevenDaysAgoStart = new Date(todayStart.getTime() - 6 * 86400000);
  const threeDaysLater = new Date(todayEnd.getTime() + 3 * 86400000);
  const thirtyDaysLater = new Date(todayEnd.getTime() + 30 * 86400000);

  return {
    todayVnStr,
    currentMonthStr,
    prevMonthStr,
    monthStart,
    prevMonthStart,
    todayStart,
    yesterdayStart,
    todayEnd,
    thisMondayStart,
    thisSundayEnd,
    prevWeekStart,
    nextMondayStart,
    nextSundayEnd,
    sevenDaysAgoStart,
    threeDaysLater,
    thirtyDaysLater
  };
}

export interface YuiProactiveAlert {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  category: 'budget' | 'inventory' | 'task' | 'debt' | 'calendar';
  title: string;
  detail: string;
  suggestedPrompt: string;
}

/**
 * Tạo danh sách nhắc nhở & cảnh báo chủ động (0 AI token, chạy hoàn toàn bằng DB query).
 */
export async function getYuiProactiveBriefing(userId: string) {
  await dbConnect();
  const now = new Date();
  const {
    currentMonthStr,
    monthStart,
    todayEnd,
    threeDaysLater
  } = computeVnPeriodBounds(now);
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await Task.updateMany(
    { user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS'] }, due_date: { $lt: now } },
    { $set: { status: 'OVERDUE' } }
  );

  const [
    wallets,
    budgets,
    monthExpenses,
    expiringInventory,
    overdueTasks,
    dueSoonTasks,
    dueDebts,
    upcomingTodayEvents
  ] = await Promise.all([
    Wallet.find({ user_id: userId }).lean(),
    Budget.find({ user_id: userId, month: currentMonthStr }).lean(),
    Transaction.find({ user_id: userId, type: 'expense', date: { $gte: monthStart } }).select('amount category').lean(),
    Inventory.find({
      user_id: userId,
      quantity: { $gt: 0 },
      expiryDate: { $ne: null, $lte: threeDaysLater }
    }).sort({ expiryDate: 1 }).limit(10).lean(),
    Task.find({ user_id: userId, status: 'OVERDUE' }).sort({ due_date: 1 }).limit(10).lean(),
    Task.find({
      user_id: userId,
      status: { $in: ['PENDING', 'IN_PROGRESS'] },
      due_date: { $gte: now, $lte: next24h }
    }).sort({ due_date: 1 }).limit(10).lean(),
    Debt.find({
      user_id: userId,
      status: { $ne: 'paid' },
      dueDate: { $ne: null, $lte: threeDaysLater }
    }).sort({ dueDate: 1 }).limit(5).lean(),
    getExpandedCalendarEvents(userId, now, todayEnd)
  ]);

  const alerts: YuiProactiveAlert[] = [];

  // 1. Cảnh báo ngân sách >= 80%
  const spentByCategory: Record<string, number> = {};
  (monthExpenses as any[]).forEach((tx) => {
    const cat = tx.category || 'other';
    spentByCategory[cat] = (spentByCategory[cat] || 0) + (tx.amount || 0);
  });

  (budgets as any[]).forEach((b) => {
    if (!b.limit || b.limit <= 0) return;
    const spent = spentByCategory[b.category] || 0;
    const ratio = spent / b.limit;
    if (ratio >= 0.8) {
      const pct = Math.round(ratio * 100);
      alerts.push({
        id: `budget-${b._id.toString()}`,
        severity: ratio >= 1 ? 'danger' : 'warning',
        category: 'budget',
        title: ratio >= 1
          ? `Vượt ngân sách ${b.name} (${pct}%)`
          : `Sắp chạm ngân sách ${b.name} (${pct}%)`,
        detail: `Đã chi ${spent.toLocaleString('vi-VN')}đ / ${b.limit.toLocaleString('vi-VN')}đ trong tháng này`,
        suggestedPrompt: `Xem chi tiết chi tiêu ${b.name} tháng này và so sánh với tháng trước`
      });
    }
  });

  // 2. Đồ tủ lạnh hết hạn / sắp hết hạn
  if ((expiringInventory as any[]).length > 0) {
    const items = expiringInventory as any[];
    const hasExpired = items.some((i) => new Date(i.expiryDate) < now);
    const preview = items.slice(0, 3).map((i) => `${i.name} (${getVnDateStr(i.expiryDate)})`).join(', ');
    alerts.push({
      id: 'inventory-expiring',
      severity: hasExpired ? 'danger' : 'warning',
      category: 'inventory',
      title: `${items.length} món tủ lạnh ${hasExpired ? 'đã/sắp hết hạn' : 'sắp hết hạn'}`,
      detail: preview + (items.length > 3 ? ` và ${items.length - 3} món khác` : ''),
      suggestedPrompt: 'Kho đồ có gì sắp hết hạn? Gợi ý món nấu ngay từ các nguyên liệu đó'
    });
  }

  // 3. Quest quá hạn hoặc sắp tới hạn
  if ((overdueTasks as any[]).length > 0 || (dueSoonTasks as any[]).length > 0) {
    const ovCount = (overdueTasks as any[]).length;
    const soonCount = (dueSoonTasks as any[]).length;
    const parts: string[] = [];
    if (ovCount > 0) parts.push(`${ovCount} quest quá hạn`);
    if (soonCount > 0) parts.push(`${soonCount} quest hạn trong 24h`);
    const sampleTitle = (overdueTasks[0] as any)?.title || (dueSoonTasks[0] as any)?.title || '';
    alerts.push({
      id: 'tasks-urgent',
      severity: ovCount > 0 ? 'danger' : 'warning',
      category: 'task',
      title: parts.join(' · '),
      detail: sampleTitle ? `Ưu tiên: "${sampleTitle}"` : 'Cần xử lý sớm để không mất MP',
      suggestedPrompt: ovCount > 0 ? 'Xem các quest quá hạn và nên làm gì trước?' : 'Hôm nay có quest nào cần làm?'
    });
  }

  // 4. Khoản nợ tới hạn
  if ((dueDebts as any[]).length > 0) {
    const firstDebt = dueDebts[0] as any;
    const hasPastDue = new Date(firstDebt.dueDate) < now;
    alerts.push({
      id: `debt-${firstDebt._id.toString()}`,
      severity: hasPastDue ? 'danger' : 'warning',
      category: 'debt',
      title: `${(dueDebts as any[]).length} khoản nợ ${hasPastDue ? 'đã/sắp tới hạn' : 'sắp tới hạn'}`,
      detail: `${firstDebt.type === 'lent' ? 'Thu của' : 'Trả cho'} ${firstDebt.personName}: ${(firstDebt.remainingAmount || 0).toLocaleString('vi-VN')}đ (hạn ${getVnDateStr(firstDebt.dueDate)})`,
      suggestedPrompt: 'Kiểm tra các khoản nợ chưa trả hiện tại'
    });
  }

  // 5. Lịch hẹn sắp tới trong hôm nay
  const activeTodayEvents = (upcomingTodayEvents as any[]).filter((e) => new Date(e.end_time) >= now);
  if (activeTodayEvents.length > 0) {
    const nextEv = activeTodayEvents[0];
    alerts.push({
      id: `cal-${nextEv._id.toString()}`,
      severity: 'info',
      category: 'calendar',
      title: `Hôm nay còn ${activeTodayEvents.length} lịch hẹn`,
      detail: `Sắp tới: ${nextEv.title} lúc ${formatVnDisplayTime(nextEv.start_time)}`,
      suggestedPrompt: 'Lịch trình hôm nay và sắp tới của Papa có gì?'
    });
  }

  return {
    userId,
    wallets: (wallets as any[]).map((w) => ({
      id: w._id.toString(),
      name: w.name,
      balance: w.balance
    })),
    alerts
  };
}

/**
 * Thu thập ngữ cảnh hệ thống có chọn lọc và động theo scopes & params của riêng User hiện tại.
 * Truy vấn đúng mục tiêu (targeted drill-down), nén dữ liệu trước khi gửi để tiết kiệm 80% token.
 */
export async function buildUserSystemContext(
  userId: string,
  scopes: YuiDataScope[] = ['all'],
  params: YuiQueryParams = {}
) {
  const isAll = scopes.includes('all');
  const needCalendar = isAll || scopes.includes('calendar');
  const needTasks = isAll || scopes.includes('tasks');
  const needFinances = isAll || scopes.includes('finances');
  const needWallets = needFinances || isAll || scopes.includes('meals_nutrition') || scopes.includes('shopping');
  const needInventory = isAll || scopes.includes('inventory_recipes') || scopes.includes('meals_nutrition') || scopes.includes('shopping');
  const needMeals = isAll || scopes.includes('meals_nutrition');
  const needWeight = isAll || scopes.includes('weight_health');
  const needShopping = isAll || scopes.includes('shopping') || scopes.includes('inventory_recipes');

  const now = new Date();
  const {
    todayVnStr,
    currentMonthStr,
    prevMonthStr,
    monthStart,
    prevMonthStart,
    todayStart,
    yesterdayStart,
    todayEnd,
    thisMondayStart,
    thisSundayEnd,
    prevWeekStart,
    nextMondayStart,
    nextSundayEnd,
    sevenDaysAgoStart,
    threeDaysLater,
    thirtyDaysLater
  } = computeVnPeriodBounds(now);

  // 1. Tự động chuyển các task quá hạn (cả PENDING lẫn IN_PROGRESS) thành OVERDUE
  if (needTasks) {
    await Task.updateMany(
      { user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS'] }, due_date: { $lt: now } },
      { $set: { status: 'OVERDUE' } }
    );
  }

  // 2. Xác định phạm vi query động cho Calendar
  const hasSpecificCalendar = needCalendar && !!params?.calendar?.date_start && !!params?.calendar?.date_end;
  const calStart = hasSpecificCalendar ? new Date(params.calendar!.date_start!) : yesterdayStart;
  const calEnd = hasSpecificCalendar ? new Date(params.calendar!.date_end!) : thirtyDaysLater;

  // 3. Xác định phạm vi query động cho Bữa ăn (truy vấn tối thiểu 7 ngày để hỗ trợ phân tích xu hướng sức khỏe)
  const hasSpecificMeals = needMeals && !!params?.meals?.date_start && !!params?.meals?.date_end;
  const mealStart = hasSpecificMeals ? new Date(params.meals!.date_start!) : todayStart;
  const mealEnd = hasSpecificMeals ? new Date(params.meals!.date_end!) : todayEnd;
  const mealQueryStart = new Date(Math.min(mealStart.getTime(), sevenDaysAgoStart.getTime()));
  const mealQueryEnd = new Date(Math.max(mealEnd.getTime(), todayEnd.getTime()));

  const safeRecipePattern = params?.inventory_recipes?.recipe_name
    ? params.inventory_recipes.recipe_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : '';

  // 4. Tải CÓ CHỌN LỌC & ĐÚNG MỤC TIÊU các tài nguyên hệ thống
  const [
    user,
    wallets,
    twoMonthTx,
    recentTx,
    openDebts,
    budgets,
    inventoryItems,
    activeTasks,
    overdueTasks,
    recentCompletedTasks,
    expandedCalendarEvents,
    allWindowMeals,
    latestWeight,
    latestHealthAnalysis,
    shoppingItems,
    recipes,
    requestedRecipe
  ] = await Promise.all([
    User.findById(userId).lean(),
    needWallets ? Wallet.find({ user_id: userId }).lean() : Promise.resolve([]),
    needFinances ? Transaction.find({ user_id: userId, date: { $gte: prevMonthStart } }).select('amount type category date walletName').lean() : Promise.resolve([]),
    needFinances ? Transaction.find({ user_id: userId }).sort({ date: -1, createdAt: -1 }).limit(8).lean() : Promise.resolve([]),
    needFinances ? Debt.find({ user_id: userId, status: { $ne: 'paid' } }).lean() : Promise.resolve([]),
    needFinances ? Budget.find({ user_id: userId, month: currentMonthStr }).lean() : Promise.resolve([]),
    needInventory ? Inventory.find({ user_id: userId, quantity: { $gt: 0 } }).sort({ expiryDate: 1 }).limit(25).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS'] } }).sort({ due_date: 1 }).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: 'OVERDUE' }).sort({ due_date: 1 }).limit(10).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: 'COMPLETED' }).sort({ completed_at: -1, updatedAt: -1 }).limit(5).lean() : Promise.resolve([]),
    needCalendar ? getExpandedCalendarEvents(userId, calStart, calEnd) : Promise.resolve([]),
    (needMeals || needWeight) ? MealLog.find({ user_id: userId, consumed_at: { $gte: mealQueryStart, $lte: mealQueryEnd } }).sort({ consumed_at: -1 }).lean() : Promise.resolve([]),
    (needWeight || needMeals) ? WeightLog.findOne({ user_id: userId }).sort({ date: -1 }).lean() : Promise.resolve(null),
    (needWeight || needMeals) ? HealthAnalysis.findOne({ user_id: userId }).sort({ analyzed_at: -1 }).lean() : Promise.resolve(null),
    needShopping ? ShoppingItem.find({ user_id: userId, checked: false }).limit(25).lean() : Promise.resolve([]),
    needInventory ? Recipe.find({ user_id: userId }).select('name ingredients').limit(15).lean() : Promise.resolve([]),
    needInventory && safeRecipePattern
      ? Recipe.findOne({ user_id: userId, name: new RegExp(safeRecipePattern, 'i') }).lean()
      : Promise.resolve(null),
  ]);

  const heightCm = (user as any)?.height || 170;
  const latestWeightKg = (latestWeight as any)?.weight || null;
  const bmi = latestWeightKg ? Number((latestWeightKg / ((heightCm / 100) ** 2)).toFixed(1)) : null;

  const context: Record<string, any> = {
    thong_tin_nhan_vat: {
      ten: (user as any)?.username || 'Papa',
      level: (user as any)?.level || 1,
      hp: `${(user as any)?.current_hp || 0}/${(user as any)?.max_hp || 1200}`,
      mp: `${(user as any)?.current_mp || 0}/${(user as any)?.max_mp || 500}`,
      chieu_cao_cm: heightCm,
      ...(latestWeightKg ? { can_nang_kg: latestWeightKg, bmi } : {})
    }
  };

  // Tài chính & Ví (Kèm thống kê so sánh tháng trước, tuần này vs tuần trước)
  if (needFinances) {
    let monthIncome = 0;
    let monthExpense = 0;
    const expenseByCategory: Record<string, number> = {};

    let prevMonthIncome = 0;
    let prevMonthExpense = 0;
    const prevMonthExpByCat: Record<string, number> = {};

    let weekExpense = 0;
    let weekIncome = 0;
    const weekExpByCat: Record<string, number> = {};

    let prevWeekExpense = 0;
    let prevWeekIncome = 0;
    const prevWeekExpByCat: Record<string, number> = {};

    (twoMonthTx as any[]).forEach(t => {
      const txTime = new Date(t.date).getTime();
      const amt = t.amount || 0;
      const cat = t.category || 'other';

      if (txTime >= monthStart.getTime()) {
        if (t.type === 'income') monthIncome += amt;
        else if (t.type === 'expense') {
          monthExpense += amt;
          expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
        }
      } else if (txTime >= prevMonthStart.getTime()) {
        if (t.type === 'income') prevMonthIncome += amt;
        else if (t.type === 'expense') {
          prevMonthExpense += amt;
          prevMonthExpByCat[cat] = (prevMonthExpByCat[cat] || 0) + amt;
        }
      }

      if (txTime >= thisMondayStart.getTime()) {
        if (t.type === 'income') weekIncome += amt;
        else if (t.type === 'expense') {
          weekExpense += amt;
          weekExpByCat[cat] = (weekExpByCat[cat] || 0) + amt;
        }
      } else if (txTime >= prevWeekStart.getTime() && txTime < thisMondayStart.getTime()) {
        if (t.type === 'income') prevWeekIncome += amt;
        else if (t.type === 'expense') {
          prevWeekExpense += amt;
          prevWeekExpByCat[cat] = (prevWeekExpByCat[cat] || 0) + amt;
        }
      }
    });

    const totalWalletBalance = (wallets as any[]).reduce((s, w) => s + (w.balance || 0), 0);

    // Xử lý mục tiêu động: danh mục chi tiêu cụ thể
    let specificCategoryData = undefined;
    if (params?.finances?.category) {
      const cat = params.finances.category;
      const budgetForCat = (budgets as any[]).find(b => b.category === cat);
      const catSpent = expenseByCategory[cat] || 0;
      specificCategoryData = {
        danh_muc: cat,
        da_chi_thang_nay: catSpent,
        thang_truoc: prevMonthExpByCat[cat] || 0,
        tuan_nay: weekExpByCat[cat] || 0,
        tuan_truoc: prevWeekExpByCat[cat] || 0,
        han_muc_ngan_sach: budgetForCat?.limit || 'Chưa đặt ngân sách',
        con_lai: budgetForCat?.limit ? budgetForCat.limit - catSpent : undefined
      };
    }

    // Xử lý mục tiêu động: ví cụ thể
    let highlightedWallet = undefined;
    if (params?.finances?.wallet_keyword) {
      const kw = normalizeVietnamese(params.finances.wallet_keyword);
      const w = (wallets as any[]).find(item => normalizeVietnamese(item.name).includes(kw));
      if (w) {
        highlightedWallet = {
          ten_vi: w.name,
          so_du: w.balance
        };
      }
    }

    context.tai_chinh = {
      thang_nam: currentMonthStr,
      thang_truoc_nam: prevMonthStr,
      tong_so_du_tat_ca_vi: totalWalletBalance,
      danh_sach_vi: (wallets as any[]).map(w => ({
        id: w._id.toString(),
        name: w.name,
        balance: w.balance
      })),
      thang_hien_tai: {
        tong_thu: monthIncome,
        tong_chi: monthExpense,
        chi_theo_danh_muc: expenseByCategory,
      },
      thang_truoc: {
        tong_thu: prevMonthIncome,
        tong_chi: prevMonthExpense,
        chi_theo_danh_muc: prevMonthExpByCat,
      },
      tuan_nay: {
        tong_thu: weekIncome,
        tong_chi: weekExpense,
        chi_theo_danh_muc: weekExpByCat,
      },
      tuan_truoc: {
        tong_thu: prevWeekIncome,
        tong_chi: prevWeekExpense,
        chi_theo_danh_muc: prevWeekExpByCat,
      },
      ngan_sach_thang_nay: (budgets as any[]).map(b => ({
        id: b._id.toString(),
        ten: b.name,
        danh_muc: b.category,
        han_muc: b.limit,
        da_chi: expenseByCategory[b.category] || 0
      })),
      chi_tiet_theo_yeu_cau: specificCategoryData || highlightedWallet,
      giao_dich_moi_nhat: (recentTx as any[]).map(t => ({
        id: t._id.toString(),
        ngay: getVnDateStr(t.date),
        gio: formatVnDisplayTime(t.date),
        loai: t.type,
        so_tien: t.amount,
        danh_muc: t.category || null,
        mo_ta: t.description,
        vi: t.walletName,
        wallet_id: t.wallet_id?.toString() || null,
        to_wallet_id: t.to_wallet_id?.toString() || null
      })),
      so_no_chua_tra: (openDebts as any[]).map(d => ({
        id: d._id.toString(),
        nguoi: d.personName,
        loai: d.type, // 'lent' = người ta nợ Papa, 'borrowed' = Papa nợ người ta
        trang_thai: d.status,
        tong_no: d.totalAmount,
        con_lai: d.remainingAmount,
        han_tra: d.dueDate ? getVnDateStr(d.dueDate) : null
      }))
    };
  } else if (needWallets) {
    context.danh_sach_vi = (wallets as any[]).map(w => ({
      id: w._id.toString(),
      name: w.name,
      balance: w.balance
    }));
  }

  // Kho đồ tủ lạnh & Công thức nấu ăn
  if (needInventory) {
    const expiringInventory = (inventoryItems as any[]).filter(item =>
      item.expiryDate && new Date(item.expiryDate) <= threeDaysLater
    );

    context.kho_do_va_cong_thuc = {
      kho_do_sap_het_han: expiringInventory.slice(0, 5).map(i => ({
        id: i._id.toString(),
        ten: i.name,
        so_luong: `${i.quantity} ${i.unit}`,
        han_su_dung: getVnDateStr(i.expiryDate)
      })),
      kho_do_hien_co: (inventoryItems as any[]).slice(0, 25).map(i => ({
        id: i._id.toString(),
        ten: i.name,
        so_luong: i.quantity,
        don_vi: i.unit,
        danh_muc: i.category,
        gia_tri_con_lai: i.totalValue || 0,
        han_su_dung: i.expiryDate ? getVnDateStr(i.expiryDate) : null
      })),
      // Danh sách công thức tóm tắt gọn gàng (lược bỏ instructions để tiết kiệm token)
      cong_thuc_nau_an_da_luu: (recipes as any[]).map(r => ({
        ten: r.name,
        nguyen_lieu_chinh: (r.ingredients || []).slice(0, 4)
      })),
      // Khi Papa hỏi chi tiết cách nấu một món cụ thể
      cong_thuc_chi_tiet_yeu_cau: requestedRecipe ? {
        ten: (requestedRecipe as any).name,
        nguyen_lieu: (requestedRecipe as any).ingredients || [],
        huong_dan_nau: (requestedRecipe as any).instructions || 'Chưa có các bước nấu chi tiết'
      } : undefined
    };
  }

  // Nhiệm vụ & Quests
  if (needTasks) {
    context.nhiem_vu_quests = {
      tong_quan: {
        dang_lam_hoac_cho: (activeTasks as any[]).length,
        qua_han: (overdueTasks as any[]).length
      },
      qua_han: (overdueTasks as any[]).map(t => ({
        id: t._id.toString(),
        tieu_de: t.title,
        rank: t.quest_rank,
        trang_thai: t.status,
        han_chot: formatVnDateTime(t.due_date)
      })),
      can_lam_uu_tien: (activeTasks as any[]).map(t => ({
        id: t._id.toString(),
        tieu_de: t.title,
        rank: t.quest_rank,
        trang_thai: t.status,
        han_chot: formatVnDateTime(t.due_date)
      })),
      da_hoan_thanh_gan_day: (recentCompletedTasks as any[]).map(t => ({
        id: t._id.toString(),
        tieu_de: t.title,
        rank: t.quest_rank
      }))
    };
  }

  // Lịch trình (Xử lý truy vấn động theo ngày cụ thể hoặc tổng quan)
  if (needCalendar) {
    const formatEventForYui = (e: any) => ({
      id: e._id.toString(),
      parent_event_id: e.parent_event_id ? e.parent_event_id.toString() : null,
      tieu_de: e.title,
      thu_va_ngay: formatVnDateOnly(e.start_time),
      thoi_gian: `${formatVnDisplayTime(e.start_time)} - ${formatVnDisplayTime(e.end_time)}`,
      start_iso: formatVnIsoString(e.start_time),
      end_iso: formatVnIsoString(e.end_time),
      ghi_chu: e.description || '',
      la_lich_lap: !!(e.is_recurring || e.is_virtual || e.parent_event_id),
      loai_lap: e.recurrence_type || null
    });

    if (hasSpecificCalendar) {
      // TRƯỜNG HỢP 1: Tra cứu đúng ngày cụ thể được chỉ định (vd: Chủ Nhật tuần này, Ngày mai, Thứ Sáu...)
      const targetEvents = (expandedCalendarEvents as any[]).filter(e => {
        const eStart = new Date(e.start_time);
        const eEnd = new Date(e.end_time);
        return eStart <= calEnd && eEnd >= calStart;
      });

      context.lich_trinh = {
        muc_tieu_tra_cuu: params.calendar!.target_date_label || formatVnDateOnly(calStart),
        tong_so_su_kien: targetEvents.length,
        danh_sach_su_kien: targetEvents.map(formatEventForYui),
        trang_thai: targetEvents.length === 0
          ? `Papa hoàn toàn rảnh rỗi vào ${params.calendar!.target_date_label || formatVnDateOnly(calStart)}, không có lịch hẹn nào.`
          : undefined
      };
    } else {
      // TRƯỜNG HỢP 2: Tra cứu tổng quan hoặc chuẩn bị dời/sửa/hủy lịch
      const todayEvents = (expandedCalendarEvents as any[]).filter(e => {
        const eStart = new Date(e.start_time);
        const eEnd = new Date(e.end_time);
        return eStart <= todayEnd && eEnd >= todayStart;
      });

      const restOfThisWeekEvents = (expandedCalendarEvents as any[]).filter(e => {
        const eStart = new Date(e.start_time);
        return eStart > todayEnd && eStart <= thisSundayEnd;
      });

      const nextWeekEvents = (expandedCalendarEvents as any[]).filter(e => {
        const eStart = new Date(e.start_time);
        return eStart >= nextMondayStart && eStart <= nextSundayEnd;
      });

      const upcomingList = (expandedCalendarEvents as any[])
        .filter(e => new Date(e.end_time) >= todayStart)
        .slice(0, 15);

      context.lich_trinh = {
        thong_tin_thoi_gian: {
          hom_nay: formatVnDateOnly(todayStart),
          tuan_nay: `${formatVnDateOnly(thisMondayStart)} đến ${formatVnDateOnly(thisSundayEnd)}`,
          tuan_toi: `${formatVnDateOnly(nextMondayStart)} đến ${formatVnDateOnly(nextSundayEnd)}`
        },
        su_kien_hom_nay: todayEvents.map(formatEventForYui),
        so_su_kien_con_lai_tuan_nay: restOfThisWeekEvents.length,
        so_su_kien_tuan_toi: nextWeekEvents.length,
        su_kien_sap_toi_gan_nhat: upcomingList.map(formatEventForYui)
      };
    }
  }

  // Sức khỏe & Bữa ăn (Xử lý ngày cụ thể + thống kê xu hướng 7 ngày qua)
  if (needMeals || needWeight) {
    const targetedMeals = (allWindowMeals as any[]).filter((m) => {
      const t = new Date(m.consumed_at).getTime();
      return t >= mealStart.getTime() && t <= mealEnd.getTime();
    });

    const last7DaysMeals = (allWindowMeals as any[]).filter((m) => {
      const t = new Date(m.consumed_at).getTime();
      return t >= sevenDaysAgoStart.getTime() && t <= todayEnd.getTime();
    });

    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    targetedMeals.forEach(m => {
      totalCalories += m.calo || 0;
      totalProtein += m.protein || 0;
      totalFat += m.fat || 0;
      totalCarbs += m.carbs || 0;
    });

    let weekCalo = 0;
    let weekProtein = 0;
    let weekFat = 0;
    let weekCarbs = 0;
    let weekSugar = 0;
    let homeCount = 0;
    let eatOutCount = 0;
    const activeDaySet = new Set<string>();
    last7DaysMeals.forEach((m) => {
      weekCalo += m.calo || 0;
      weekProtein += m.protein || 0;
      weekFat += m.fat || 0;
      weekCarbs += m.carbs || 0;
      weekSugar += m.sugar || 0;
      if (m.source === 'home') homeCount++;
      else eatOutCount++;
      activeDaySet.add(getVnDateStr(m.consumed_at));
    });
    const activeDaysCount = Math.max(1, activeDaySet.size);

    context.suc_khoe_va_bua_an = {
      khoang_thoi_gian: hasSpecificMeals ? (params.meals!.target_date_label || 'Ngày yêu cầu') : 'Hôm nay',
      tong_calo: totalCalories,
      macro: { protein_g: totalProtein, fat_g: totalFat, carbs_g: totalCarbs },
      cac_bua_an: targetedMeals.map(m => ({
        mon: m.food_name,
        loai_bua: m.meal_tier,
        nguon: m.source,
        calo: m.calo,
        gia_tien: m.cost || 0,
        thoi_gian: formatVnDisplayTime(m.consumed_at)
      })),
      xu_huong_7_ngay_qua: {
        so_ngay_co_ghi_nhan: activeDaySet.size,
        tong_so_bua: last7DaysMeals.length,
        bua_tu_nau: homeCount,
        bua_an_ngoai: eatOutCount,
        tong_calo_7_ngay: weekCalo,
        trung_binh_calo_moi_ngay_co_an: Math.round(weekCalo / activeDaysCount),
        trung_binh_macro_moi_ngay: {
          protein_g: Math.round(weekProtein / activeDaysCount),
          fat_g: Math.round(weekFat / activeDaysCount),
          carbs_g: Math.round(weekCarbs / activeDaysCount),
          sugar_g: Math.round(weekSugar / activeDaysCount)
        }
      },
      ...(latestHealthAnalysis ? {
        nhan_xet_chuyen_gia_gan_nhat: {
          ngay_phan_tich: getVnDateStr((latestHealthAnalysis as any).analyzed_at),
          noi_dung_tom_tat: String((latestHealthAnalysis as any).analysis_text || '').slice(0, 500)
        }
      } : {}),
      can_nang_gan_nhat_kg: latestWeightKg,
      bmi
    };
  }

  // Danh sách mua sắm
  if (needShopping) {
    context.danh_sach_mua_sam_can_mua = (shoppingItems as any[]).map(s => ({
      id: s._id.toString(),
      ten: s.name,
      so_luong: s.quantity,
      don_vi: s.unit,
      danh_muc: s.category
    }));
  }

  return context;
}

type YuiActionRecord = Record<string, unknown> & { actionType?: string };

/**
 * Chuẩn hóa toàn bộ trường ngày/giờ trong mảng actions trả về từ AI về chuẩn ISO Việt Nam (+07:00),
 * đồng thời điền giá trị mặc định nếu AI bỏ trống để UI xác nhận và DB luôn khớp 100%.
 */
export function normalizeYuiActions<T extends YuiActionRecord>(actions: T[], now: Date = new Date()): T[] {
  if (!Array.isArray(actions)) return [];
  const defaultMonth = getVnDateStr(now).slice(0, 7);

  return actions.map((rawAction) => {
    if (!rawAction || typeof rawAction !== 'object') return rawAction;
    const action: YuiActionRecord = { ...rawAction };
    const type = action.actionType;

    if (type === 'create_calendar_event') {
      const start = parseVnDateTime(action.start_time, '09:00:00') ?? now;
      let end = parseVnDateTime(action.end_time, '10:00:00');
      if (!end || end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      action.start_time = formatVnIsoString(start);
      action.end_time = formatVnIsoString(end);
      action.is_recurring = Boolean(action.is_recurring);
      if (action.is_recurring) {
        const recType = String(action.recurrence_type || 'WEEKLY').toUpperCase();
        action.recurrence_type = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(recType) ? recType : 'WEEKLY';
        if (Array.isArray(action.recurrence_days)) {
          action.recurrence_days = Array.from(
            new Set(
              action.recurrence_days
                .map((d) => Number(d))
                .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
            )
          );
        }
        if (action.recurrence_end) {
          const normalizedRecEnd = normalizeToVnIso(action.recurrence_end, undefined, '23:59:59');
          if (normalizedRecEnd) action.recurrence_end = normalizedRecEnd;
          else delete action.recurrence_end;
        }
      } else {
        delete action.recurrence_type;
        delete action.recurrence_days;
        delete action.recurrence_end;
      }
      return action as T;
    }

    if (type === 'update_calendar_event') {
      if (action.start_time) {
        const start = parseVnDateTime(action.start_time, '09:00:00');
        if (start) {
          action.start_time = formatVnIsoString(start);
        } else {
          delete action.start_time;
        }
      }
      if (action.end_time) {
        const end = parseVnDateTime(action.end_time, '10:00:00');
        if (end) {
          action.end_time = formatVnIsoString(end);
        } else {
          delete action.end_time;
        }
      }
      return action as T;
    }

    if (type === 'delete_calendar_event') {
      if (action.start_time) {
        const normalizedStart = normalizeToVnIso(action.start_time, undefined, '09:00:00');
        if (normalizedStart) action.start_time = normalizedStart;
      }
      return action as T;
    }

    if (type === 'create_task') {
      const defaultDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      action.due_date = normalizeToVnIso(action.due_date, defaultDue, '23:59:00');
      return action as T;
    }

    if (type === 'update_task') {
      if (action.due_date) {
        const normalizedDue = normalizeToVnIso(action.due_date, undefined, '23:59:00');
        if (normalizedDue) action.due_date = normalizedDue;
        else delete action.due_date;
      }
      if (action.custom_time) {
        const normalizedCustom = normalizeToVnIso(action.custom_time, undefined, '12:00:00');
        if (normalizedCustom) action.custom_time = normalizedCustom;
        else delete action.custom_time;
      }
      return action as T;
    }

    if (type === 'create_inventory' || type === 'purchase_shopping') {
      action.custom_time = normalizeToVnIso(action.custom_time, now, '12:00:00');
      if (action.expiryDate) {
        const normalizedExp = normalizeToVnIso(action.expiryDate, undefined, '12:00:00');
        if (normalizedExp) action.expiryDate = normalizedExp;
        else delete action.expiryDate;
      }
      return action as T;
    }

    if (type === 'update_inventory') {
      action.custom_time = normalizeToVnIso(action.custom_time, now, '12:00:00');
      if (action.expiryDate) {
        const normalizedExp = normalizeToVnIso(action.expiryDate, undefined, '12:00:00');
        if (normalizedExp) action.expiryDate = normalizedExp;
        else delete action.expiryDate;
      }
      return action as T;
    }

    if (type === 'upsert_budget') {
      if (typeof action.month !== 'string' || !/^\d{4}-\d{2}$/.test(action.month.trim())) {
        action.month = defaultMonth;
      } else {
        action.month = action.month.trim();
      }
      return action as T;
    }

    if (type === 'update_transaction') {
      if (action.custom_time) {
        const normalizedCustom = normalizeToVnIso(action.custom_time, undefined, '12:00:00');
        if (normalizedCustom) action.custom_time = normalizedCustom;
        else delete action.custom_time;
      }
      return action as T;
    }

    if (type === 'delete_task' || type === 'delete_transaction') {
      if (action.custom_time) {
        const normalizedCustom = normalizeToVnIso(action.custom_time, undefined, '12:00:00');
        if (normalizedCustom) action.custom_time = normalizedCustom;
        else delete action.custom_time;
      }
      return action as T;
    }

    if (
      type === 'meal' ||
      type === 'expense' ||
      type === 'income' ||
      type === 'transfer' ||
      type === 'debt_lent' ||
      type === 'debt_borrowed' ||
      type === 'pay_debt' ||
      type === 'record_weight' ||
      type === 'complete_task' ||
      type === 'create_shopping_item' ||
      type === 'create_recipe'
    ) {
      action.custom_time = normalizeToVnIso(action.custom_time, now, '12:00:00');
    }

    return action as T;
  });
}

/**
 * Phân tích yêu cầu tự nhiên từ người dùng bằng kiến trúc 2 lượt (2-Turn Intent Routing & Scoped Execution):
 * - Lượt 1: Phân loại ý định, xác định đúng các scopes dữ liệu cần thiết (siêu nhẹ ~150 tokens, cực nhanh).
 * - Lượt 2: Truy xuất đúng dữ liệu nghiệp vụ theo scopes, đưa ra câu trả lời và hành động chính xác, không bị loãng context.
 */
export async function parseYuiRequest(
  userId: string,
  text: string,
  history: { role: string; text: string }[] = [],
  imageData?: string
) {
  await dbConnect();
  const now = new Date();
  const todayVnStr = getVnDateStr(now);
  const nowClockStr = formatVnClockString(now);
  const nowStr = `${formatVnDateTime(now)} (${nowClockStr} giờ Việt Nam)`;
  const hasImage = Boolean(imageData && typeof imageData === 'string' && imageData.startsWith('data:image/'));
  const normalizedUserText = text?.trim() || (hasImage ? 'Hãy phân tích hình ảnh này giúp Papa và đề xuất hành động lưu phù hợp nếu có.' : '');

  // Định dạng lịch sử trò chuyện gần nhất (tối đa 6 lượt)
  let historySection = '';
  if (history && Array.isArray(history) && history.length > 0) {
    const lines = history.slice(-6).map(h => {
      const speaker = h.role === 'user' ? 'Papa' : 'Yui';
      const cleanContent = (h.text || '').length > 300 ? (h.text || '').slice(0, 300) + '...' : h.text;
      return `${speaker}: "${cleanContent}"`;
    });
    historySection = `
LỊCH SỬ ĐỐI THOẠI GẦN ĐÂY GIỮA PAPA VÀ YUI:
${lines.join('\n')}
`;
  }

  // =========================================================================
  // LƯỢT 1: ĐỊNH TUYẾN Ý ĐỊNH & TRÍCH XUẤT THAM SỐ ĐỘNG (INTENT & PARAMS ROUTER)
  // =========================================================================
  let detectedScopes: YuiDataScope[] = ['all'];
  let detectedParams: YuiQueryParams = {};

  if (hasImage) {
    // Khi có ảnh đính kèm (bill, món ăn, cân nặng, ghi chú lịch/task), tải đủ context để nhận diện & khớp ID chính xác
    detectedScopes = ['all'];
  } else {
    // BƯỚC 1.1: Fast-Path Regex & Dynamic Date Resolver (0ms, không tốn AI token/quota, chống 429 rate limit)
    const fastResult = detectFastScopesAndParams(normalizedUserText, now);
    if (fastResult && fastResult.scopes.length > 0) {
      detectedScopes = fastResult.scopes;
      detectedParams = fastResult.params;
    } else {
      // BƯỚC 1.2: AI Router (Chỉ gọi khi câu hỏi phức tạp hoặc phụ thuộc lịch sử ngữ cảnh)
      const routerPrompt = `Bạn là hệ thống phân loại ý định (Intent Router) của Trợ lý ảo Yui (SAO).
Dựa vào câu nói mới nhất của Papa và lịch sử đối thoại, hãy xác định các mảng dữ liệu nghiệp vụ (scopes) và các tham số truy vấn động (params) để hệ thống BE truy xuất đúng trọng tâm.

CÁC MẢNG NGHIỆP VỤ (SCOPES) HỢP LỆ:
- "calendar": Lịch trình, cuộc hẹn, tạo/dời/hủy sự kiện, lịch lặp, nghỉ 1 buổi. Chỉ điền target_date_label khi Papa hỏi XEM lịch ngày cụ thể; KHÔNG khóa target_date_label khi Papa muốn dời/sửa/hủy lịch.
- "tasks": Nhiệm vụ, Quest SAO (tạo, hoàn thành, hoàn tác, đổi deadline, chuyển trạng thái, xóa).
- "finances": Tiền nong, số dư ví, thu/chi, chuyển ví, vay/trả nợ, đặt/sửa hạn mức ngân sách, sửa/xóa giao dịch.
- "inventory_recipes": Tủ lạnh, kho thực phẩm, dùng/vứt đồ trong kho, đồ sắp hết hạn, công thức nấu ăn.
- "meals_nutrition": Ghi nhận món ăn/uống (ăn ngoài hoặc tự nấu trừ kho), calo nạp trong ngày, macro dinh dưỡng.
- "weight_health": Cập nhật hoặc xem cân nặng, chiều cao, chỉ số sức khỏe.
- "shopping": Danh sách mua sắm cần mua hoặc đánh dấu mua xong nhập kho.
- "general_chat": Chào hỏi, tâm sự thông thường.

${historySection}
THỜI ĐIỂM HIỆN TẠI CỦA HỆ THỐNG:
${nowStr}

CÂU NÓI MỚI NHẤT CỦA PAPA:
"${normalizedUserText}"

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "scopes": ["calendar", ...],
  "params": {
    "calendar": { "target_date_label": "Chủ Nhật tuần này" },
    "inventory_recipes": { "recipe_name": "sườn xào", "need_recipe_instructions": true },
    "finances": { "wallet_keyword": "momo", "category": "food" },
    "meals": { "target_date_label": "Hôm qua" },
    "tasks": { "status": "OVERDUE" }
  }
}`;

      try {
        const routeResRaw = await generateContentWithFallback(routerPrompt, undefined, true, 5000);
        const routeJson = extractJsonFromAiResponse(routeResRaw);
        if (Array.isArray(routeJson)) {
          detectedScopes = routeJson as YuiDataScope[];
        } else if (routeJson?.scopes && Array.isArray(routeJson.scopes) && routeJson.scopes.length > 0) {
          detectedScopes = routeJson.scopes as YuiDataScope[];
          if (routeJson.params && typeof routeJson.params === 'object') {
            detectedParams = routeJson.params;
            const isRescheduleText = /\b(doi|lui|chuyen|sua|xoa|huy|nghi)\b/.test(normalizeVietnamese(normalizedUserText));
            if (isRescheduleText && detectedParams.calendar) {
              delete detectedParams.calendar;
            }
            // Nếu router trả về target_date_label mà chưa có date_start, tự tính bằng resolveVnDateExpression
            if (detectedParams.calendar?.target_date_label && !detectedParams.calendar.date_start) {
              const resolved = resolveVnDateExpression(normalizeVietnamese(detectedParams.calendar.target_date_label), now);
              if (resolved) {
                detectedParams.calendar.date_start = resolved.start.toISOString();
                detectedParams.calendar.date_end = resolved.end.toISOString();
                detectedParams.calendar.target_date_label = resolved.label;
              }
            }
            if (detectedParams.meals?.target_date_label && !detectedParams.meals.date_start) {
              const resolved = resolveVnDateExpression(normalizeVietnamese(detectedParams.meals.target_date_label), now);
              if (resolved) {
                detectedParams.meals.date_start = resolved.start.toISOString();
                detectedParams.meals.date_end = resolved.end.toISOString();
                detectedParams.meals.target_date_label = resolved.label;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Yui Router Turn 1 fallback to all:", err);
        detectedScopes = ['all'];
      }
    }
  }

  // =========================================================================
  // LƯỢT 2: TRUY XUẤT DỮ LIỆU ĐỘNG THEO SCOPES & PARAMS & SOẠN CÂU TRẢ LỜI
  // =========================================================================
  const userContext = await buildUserSystemContext(userId, detectedScopes, detectedParams);

  const imageGuidanceSection = hasImage
    ? `
QUY TẮC PHÂN TÍCH HÌNH ẢNH ĐÍNH KÈM (MULTIMODAL VISION):
- Papa có gửi kèm MỘT HÌNH ẢNH. Hãy quan sát kỹ ảnh kết hợp câu nói của Papa để phân loại chính xác:
  1) HÓA ĐƠN MUA SẮM / SIÊU THỊ / BIÊN LAI:
     * Bóc tách từng món (tên, số lượng, đơn vị, tổng tiền VND).
     * Nếu món khớp với "danh_sach_mua_sam_can_mua" hoặc là thực phẩm/đồ gia dụng cần nhập kho -> dùng "purchase_shopping" (nhớ đối chiếu shopping_item_id nếu khớp!). Nếu là hóa đơn ăn uống ngoài hàng / dịch vụ -> dùng "meal" hoặc "expense".
     * Gắn ví Papa chỉ định trong text; nếu Papa chưa nói ví thì chọn ví phù hợp trong "danh_sach_vi" và nhắc Papa kiểm tra/chọn lại ví ngay trên card xác nhận.
  2) BIÊN LAI CHUYỂN KHOẢN NGÂN HÀNG / VÍ ĐIỆN TỬ:
     * Đọc số tiền, nội dung, ngân hàng gửi/nhận -> tạo "transfer" (nếu chuyển giữa 2 ví của Papa), "expense", hoặc "pay_debt" nếu khớp người nợ.
  3) ẢNH BỮA ĂN / ĐỒ UỐNG:
     * Nhận diện tên món, các thành phần nhìn thấy, ước lượng khẩu phần & calo/macro chuẩn VN -> tạo "meal" kèm "ai_description" chi tiết.
  4) ẢNH CÂN ĐIỆN TỬ / CHỈ SỐ CƠ THỂ:
     * Đọc chính xác số kg -> tạo "record_weight".
  5) ẢNH GHI CHÚ / THỜI KHÓA BIỂU / DANH SÁCH VIỆC:
     * Bóc tách thành "create_calendar_event", "create_task", hoặc "create_shopping_item".
`
    : '';

  const prompt = `Bạn là Yui, Trợ lý Trí tuệ Nhân tạo Định vị (Navigation Pixie) thân thiết và tận tuỵ trong hệ thống Sword Art Online (SAO) của riêng người dùng (Papa).

QUY TẮC BẢO MẬT TUYỆT ĐỐI VỀ DỮ LIỆU ĐA NGƯỜI DÙNG:
- Bạn CHỈ phục vụ và CHỈ có quyền truy cập dữ liệu của chính Papa hiện tại.
- Bạn TUYỆT ĐỐI KHÔNG CÓ dữ liệu, không bao giờ biết và KHÔNG ĐƯỢC PHÉP tiết lộ hay nhắc đến bất kỳ người dùng/player nào khác trong hệ thống.
- Nếu người dùng hỏi về tài khoản khác, dữ liệu người khác hoặc hệ thống chung của player khác, hãy trả lời dễ thương nhưng kiên định rằng: Yui là Pixie định vị riêng của Papa, chỉ có quyền truy cập và quản lý dữ liệu cá nhân của Papa thôi.

PHONG CÁCH GIAO TIẾP CỦA YUI:
- Xưng "Yui", gọi người dùng là "Papa" (hoặc xưng hô theo phong cách Yui trong anime SAO: thông minh, quan tâm, ngọt ngào, đáng yêu, số liệu chuẩn xác).
- Khi trả lời thông tin ("xem hộ"), hãy trả lời tự nhiên, rõ ràng, có điểm nhấn (dùng bullet point, emoji, số liệu cụ thể từ dữ liệu thực tế bên dưới). Không dùng câu chữ khô khan như chatbot máy móc.

THỜI GIAN HIỆN TẠI CỦA HỆ THỐNG:
${nowStr}

DỮ LIỆU HIỆN TẠI CỦA PAPA TRONG HỆ THỐNG (Đã được tính toán chính xác, tuyệt đối không bịa số liệu):
${JSON.stringify(userContext, null, 2)}
${historySection}
CÂU NÓI MỚI NHẤT CỦA PAPA:
"${normalizedUserText}"
${imageGuidanceSection}

QUY TẮC BẢO TOÀN NGỮ CẢNH HỘI THOẠI (CONTEXT LINKING):
- BẮT BUỘC kết hợp ngữ cảnh từ 'LỊCH SỬ ĐỐI THOẠI GẦN ĐÂY' để hiểu các câu hỏi nối tiếp, câu hỏi phụ thuộc hoặc đại từ chỉ định của Papa!
  Ví dụ:
  * Nếu câu trước Papa vừa hỏi "Kho có gì?", Yui vừa liệt kê trứng gà, thịt bò, cà chua, mì tôm...
  * Câu tiếp theo Papa hỏi "Nấu được món gì từ những nguyên liệu này?" hay "Còn món nào khác không?", "Nên làm gì tiếp theo?":
    -> Phải hiểu ngay "những nguyên liệu này" chính là các nguyên liệu Yui vừa liệt kê và đang có trong kho đồ ('kho_do_hien_co')!
    -> Hãy tư vấn 2-3 món ăn hấp dẫn, dễ nấu từ các nguyên liệu có sẵn đó, gợi ý cách làm ngắn gọn và ước lượng calo cho Papa.
    -> Đặt "actions": [] vì đây là câu hỏi tư vấn ("xem hộ"), toàn bộ câu trả lời chi tiết, đáng yêu đặt trong trường "reply".

QUY TẮC TẠO & LƯU CÔNG THỨC NẤU ĂN (RECIPE CREATION):
- Khi Papa nhờ Yui tạo công thức nấu ăn, lên công thức món, hướng dẫn nấu hoặc lưu công thức (VD: "tạo công thức nấu ăn sườn xào chua ngọt phiên bản với cà chua", "lên công thức làm món X", "cho tôi công thức Y"):
  * VỀ CÂU TRẢ LỜI ("reply"): Yui trả lời cực kỳ đáng yêu, tình cảm, chu đáo, trình bày hướng dẫn công thức chuẩn vị thơm ngon gồm:
    1. Giới thiệu món ăn và điểm đặc biệt.
    2. Danh sách nguyên liệu chuẩn bị rõ ràng (kèm định lượng phù hợp cho 2-4 người).
    3. Các bước chế biến chi tiết, dễ làm.
  * VỀ HÀNH ĐỘNG ("actions"): BẮT BUỘC tạo một hành động { actionType: "create_recipe", ... } để Papa bấm xác nhận lưu vào Thực Đơn chỉ với 1 click.

QUY TẮC BẮT BUỘC VỀ VÍ / TÀI KHOẢN KHI CÓ NHIỀU NGUỒN (MULTI-WALLET):
- Khi người dùng đề cập nhiều hành động chi tiêu/thu tiền với nhiều ví khác nhau trong cùng một câu:
  (Ví dụ: "ăn phở 50k bằng mb, uống cà phê 20k bằng momo"):
  - TỪNG hành động trong mảng "actions" BẮT BUỘC phải mang "wallet_id" và "walletName" CHÍNH XÁC tương ứng với tài khoản/ví mà người dùng chỉ định cho món đó!
  - TUYỆT ĐỐI KHÔNG GỘP CHUNG VÍ nếu người dùng đã chỉ định 2 nguồn khác nhau!

QUY TẮC CHUYỂN KHOẢN GIỮA CÁC VÍ / TÀI KHOẢN NỘI BỘ (TRANSFER):
- Khi Papa chuyển tiền, nạp ví hoặc rút tiền mặt từ tài khoản/ví này sang tài khoản/ví khác CỦA CHÍNH PAPA (VD: "chuyển 500k từ MB sang Momo", "nạp 300k từ VCB vào Momo", "rút 1tr từ MB về tiền mặt"):
  * BẮT BUỘC dùng DUY NHẤT 1 hành động { "actionType": "transfer", ... }!
  * TUYỆT ĐỐI KHÔNG tách thành 1 hành động "expense" + 1 hành động "income" (vì sẽ làm sai lệch báo cáo tổng thu/chi tháng!).
  * So khớp từ "tai_chinh.danh_sach_vi" để điền:
    - "wallet_id" và "walletName": ví NGUỒN (bị trừ tiền).
    - "to_wallet_id" và "toWalletName": ví ĐÍCH (được cộng tiền).

QUY TẮC THU NỢ / TRẢ NỢ TRÊN SỔ NỢ CÓ SẴN (PAY DEBT):
- Khi Papa báo người khác trả nợ mình HOẶC mình trả nợ cho ai đó (VD: "anh Nam vừa trả 200k vào MB", "trả nợ Hùng 500k tiền mặt", "tất toán nợ cho bạn Linh bằng Momo"):
  * Kiểm tra "tai_chinh.so_no_chua_tra": nếu khớp tên người đang có khoản nợ chưa tất toán -> BẮT BUỘC dùng "pay_debt" (KHÔNG tạo "income"/"expense" rời và KHÔNG dùng "debt_lent"/"debt_borrowed" mới!).
  * Điền đúng "debt_id", "person", "debt_type" ("lent" nếu người ta nợ Papa và trả lại Papa; "borrowed" nếu Papa nợ người ta và Papa đi trả).
  * Nếu Papa nói "trả hết" / "tất toán", đặt "amount" bằng "con_lai" của khoản nợ đó.
  * Nếu Papa chưa nêu rõ ví nhưng có ví trong "danh_sach_vi" (ưu tiên ví Tiền mặt hoặc ví có số dư phù hợp), hãy chọn ví hợp lý và ghi rõ trong "reply" để Papa kiểm tra trước khi bấm xác nhận.

QUY TẮC BỮA ĂN NẤU TẠI NHÀ TRỪ KHO (HOME MEAL vs EAT OUT):
- Chỉ khi Papa nói rõ tự nấu / nấu ở nhà / ăn đồ trong tủ lạnh / dùng nguyên liệu trong kho (VD: "trưa nay tự nấu mì với 2 quả trứng trong tủ", "nấu cơm gà với 200g ức gà"):
  * Đặt "source": "home" và đối chiếu "kho_do_va_cong_thuc.kho_do_hien_co" để điền "ingredients_used": [{ "invId": "<id>", "name": "<tên trong kho>", "qty": <số lượng dùng>, "unit": "<đơn vị trong kho>" }].
  * Quy đổi đơn vị cho khớp với "don_vi" trong kho nếu cần (VD: kho lưu 0.5 kg, dùng 200g -> qty: 0.2; kho lưu quả -> qty nguyên số quả).
  * Nếu không mua thêm gì bên ngoài thì đặt "amount": 0 (hệ thống tự tính chi phí món theo giá vốn nguyên liệu trong kho, không trừ nhầm tiền ví!). Nếu có mua thêm đồ ngoài (vd "mua thêm 10k rau bằng Momo") thì ghi "amount": 10000 kèm ví đó.
- Ngược lại, ăn hàng/quán hoặc không nhắc dùng nguyên liệu trong kho -> đặt "source": "eat_out".

QUY TẮC ĐI CHỢ XONG -> TICK SHOPPING + NHẬP KHO + TRỪ VÍ (PURCHASE SHOPPING):
- Khi Papa báo đã mua xong các món trong danh sách mua sắm (VD: "mua xong sữa và trứng trong danh sách rồi, hết 95k bằng Momo, cất tủ lạnh", "đi chợ xong 2 hộp sữa 60k và bó rau 20k bằng tiền mặt"):
  * Dùng "purchase_shopping" cho TỪNG món để khớp "shopping_item_id" từ "danh_sach_mua_sam_can_mua" (nếu có), tick đã mua + cất vào Kho đồ + tạo giao dịch chi tiêu tương ứng.
  * Nếu Papa chỉ nêu 1 tổng tiền cho nhiều món (vd "mua xong sữa và trứng hết 100k"), hãy phân bổ hợp lý "amount" cho từng món sao cho TỔNG "amount" đúng bằng tổng tiền Papa trả, và ghi chú rõ phần ước chia này trong "reply" để Papa xem xác nhận.
  * Nếu Papa nói rõ chỉ tick đã mua xong mà không cất kho (vd đồ dùng tiêu hao ngay) -> đặt "add_to_inventory": false. Nếu không nhắc giá tiền -> "amount": 0.
- Nếu Papa báo dùng hết / bỏ đi / vứt đồ hỏng / chỉnh số lượng đồ trong tủ lạnh -> dùng "update_inventory" với "inv_id" khớp từ "kho_do_hien_co".

QUY TẮC SỬA / DỜI / HỦY / LỊCH LẶP (CALENDAR, TASK, TRANSACTION, BUDGET):
- TUYỆT ĐỐI chỉ lấy "id" / "event_id" / "task_id" / "transaction_id" / "debt_id" / "inv_id" / "shopping_item_id" có thật trong DỮ LIỆU HIỆN TẠI bên dưới, KHÔNG bao giờ tự bịa ID!
- Nếu không tìm thấy bản ghi khớp để sửa/xóa -> đặt "actions": [] và báo rõ cho Papa biết bạn không thấy mục đó trong hệ thống để tránh sửa nhầm.
- Với Lịch lặp ("create_calendar_event"): nếu Papa đặt lịch định kỳ ("mỗi ngày", "hàng tuần thứ 2-4-6", "mỗi tháng ngày 15"...):
  * Đặt "is_recurring": true, "recurrence_type": "DAILY"|"WEEKLY"|"MONTHLY"|"YEARLY".
  * Với "WEEKLY": điền "recurrence_days" theo chuẩn JS (0=Chủ Nhật, 1=Thứ 2, 2=Thứ 3, 3=Thứ 4, 4=Thứ 5, 5=Thứ 6, 6=Thứ 7).
- Với Dời/Sửa lịch ("update_calendar_event") hoặc Nghỉ/Hủy 1 buổi/Xóa lịch ("delete_calendar_event"):
  * Nếu sự kiện là lịch lặp ("la_lich_lap": true) và Papa chỉ nghỉ/đổi 1 ngày cụ thể ("thứ 6 tuần này nghỉ tập gym", "dời buổi tập tối nay sang 20h"): giữ nguyên "event_id" (hoặc composite id) và "parent_event_id", điền "exception_date": "<start_iso của buổi đó>", đặt "scope": "single".
  * Nếu Papa muốn đổi/dừng hẳn cả chuỗi lặp -> đặt "scope": "series".

QUY TẮC CHUẨN HOÁ TÊN MÓN VÀ MÔ TẢ (CHỐNG LỖI TỪ OUTDATE):
- Tuyệt đối LOẠI BỎ mọi từ chỉ thời gian tương đối khỏi "food_name", "title" và "description" như:
  "sáng nay", "trưa nay", "chiều nay", "tối nay", "hôm nay", "hôm qua", "vừa ăn", "vừa mới", "mới mua", "lúc nãy", "buổi sáng", "bữa sáng"...
- Nếu câu nói có từ chỉ thời gian trong ngày hoặc giờ cụ thể ("sáng nay", "trưa nay", "14h chiều nay", "tối qua"...), hãy xác định thời điểm thực tế theo GIỜ VIỆT NAM và lưu vào trường "custom_time" dưới dạng "YYYY-MM-DD HH:mm":
  * "sáng nay" / "buổi sáng": ${todayVnStr} 08:00
  * "trưa nay" / "buổi trưa": ${todayVnStr} 12:00
  * "chiều nay" / "buổi chiều": ${todayVnStr} 15:30
  * "tối nay" / "buổi tối": ${todayVnStr} 19:00
  * "hôm qua": lùi lại 1 ngày so với ${todayVnStr} (nếu không nói giờ/buổi thì dùng 12:00 của ngày hôm qua).
  * Nếu Papa nói rõ giờ: ghi ĐÚNG giờ 24h đó theo giờ Việt Nam.
  * Mặc định dùng đúng thời điểm hiện tại "${nowClockStr}" nếu Papa không nói rõ thời gian khác.

QUY TẮC BẮT BUỘC VỀ MÚI GIỜ VIỆT NAM (CHỐNG LỆCH +7 GIỜ):
- MỌI trường thời gian ("custom_time", "due_date", "start_time", "end_time", "recurrence_end", "expiryDate") BẮT BUỘC phải viết theo đúng giờ Việt Nam (24h) dưới dạng chuỗi "YYYY-MM-DD HH:mm" (riêng "expiryDate" nếu chỉ có ngày thì ghi "YYYY-MM-DD").
- TUYỆT ĐỐI KHÔNG tự cộng hay trừ 7 tiếng, KHÔNG quy đổi sang UTC và KHÔNG thêm hậu tố "Z" hoặc ký hiệu múi giờ khác!
- Với "create_task": nếu không nêu giờ hạn chót -> "23:59" của ngày đó; nếu không nêu ngày -> sau hiện tại 24 giờ.
- Với "create_calendar_event": nếu không nêu giờ kết thúc -> "end_time" sau "start_time" 1 tiếng.

QUY TẮC ĐÁNH GIÁ DINH DƯỠNG & CALO (CHUẨN CHUYÊN GIA DINH DƯỠNG):
- BẮT BUỘC ước tính calo dựa trên MỘT KHẨU PHẦN ĂN TIÊU CHUẨN ĐẦY ĐỦ CỦA NGƯỜI VIỆT NAM (tính cả dầu mỡ chiên xào, gia vị, nhân thịt, tinh bột, sốt, đồ ăn kèm).
  Tham chiếu thực tế: Bánh mì kẹp đầy đủ 380-450 kcal; Phở bò/Bún bò/Bún chả 480-580 kcal; Cơm tấm sườn bì chả 680-850 kcal; Xôi xéo/xôi thịt 450-550 kcal; Cà phê sữa/Trà sữa 180-420 kcal.
- BẮT BUỘC cung cấp trường "ai_description" cho mỗi action meal (2-3 câu ước tính định lượng cụ thể từng thành phần).

QUY TẮC VỀ LỊCH TRÌNH VÀ THỨ TRONG TUẦN (CALENDAR & WEEKDAY ACCURACY):
- BẮT BUỘC sử dụng chính xác Thứ từ trường "thu_va_ngay" trong "lich_trinh", tuyệt đối không tự đoán thứ!

NHIỆM VỤ CỦA BẠN:
1. XEM HỘ (Tra cứu, hỏi thông tin, tư vấn, trò chuyện):
   - Đặt "actions": [] và trả lời chi tiết, ngọt ngào, chuẩn xác trong "reply".

2. LÀM HỘ (Ghi mới, cập nhật, hoàn tất, hủy/xóa vào DB để Papa XÁC NHẬN):
   - Các actionType hợp lệ:
     a) "meal": Bữa ăn/uống (ăn ngoài hoặc tự nấu trừ kho).
        - Fields: { actionType: "meal", food_name: string, meal_tier: "HEAVY"|"LIGHT"|"DRINK", source: "eat_out"|"home", ingredients_used?: [{ invId: string, name: string, qty: number, unit: string }], calo: number, protein: number, fat: number, carbs: number, sugar: number, amount: number, wallet_id?: string, walletName?: string, description: string, ai_description: string, custom_time: "YYYY-MM-DD HH:mm" }
     b) "expense": Chi tiêu thông thường.
        - Fields: { actionType: "expense", amount: number, category: "housing"|"transport"|"entertainment"|"shopping"|"health"|"other"|"food", description: string, wallet_id: string, walletName: string, custom_time: "YYYY-MM-DD HH:mm" }
     c) "income": Tiền thu vào.
        - Fields: { actionType: "income", amount: number, category: "salary"|"bonus"|"investment"|"gift"|"other", description: string, wallet_id: string, walletName: string, custom_time: "YYYY-MM-DD HH:mm" }
     d0) "transfer": Chuyển tiền / nạp ví / rút tiền giữa 2 ví nội bộ.
        - Fields: { actionType: "transfer", amount: number, description: string, wallet_id: string, walletName: string, to_wallet_id: string, toWalletName: string, custom_time: "YYYY-MM-DD HH:mm" }
     d) "debt_lent": Cho vay / Trả tiền hộ ai đó (khoản nợ mới).
        - Fields: { actionType: "debt_lent", person: string, amount: number, description: string, wallet_id: string, walletName: string, custom_time: "YYYY-MM-DD HH:mm" }
     e) "debt_borrowed": Đi vay tiền ai đó (khoản nợ mới).
        - Fields: { actionType: "debt_borrowed", person: string, amount: number, description: string, wallet_id: string, walletName: string, custom_time: "YYYY-MM-DD HH:mm" }
     e2) "pay_debt": Thu nợ / Trả bớt / Tất toán khoản nợ ĐÃ CÓ trong "tai_chinh.so_no_chua_tra".
        - Fields: { actionType: "pay_debt", debt_id: string, person: string, debt_type: "lent"|"borrowed", amount: number, wallet_id: string, walletName: string, description?: string, custom_time: "YYYY-MM-DD HH:mm" }
     e3) "upsert_budget": Đặt hoặc cập nhật hạn mức ngân sách chi tiêu tháng.
        - Fields: { actionType: "upsert_budget", category: "food"|"housing"|"transport"|"entertainment"|"shopping"|"health"|"other", name?: string, month?: "YYYY-MM", limit: number }
     e4) "update_transaction": Sửa giao dịch ĐÃ CÓ trong "tai_chinh.giao_dich_moi_nhat".
        - Fields: { actionType: "update_transaction", transaction_id: string, description?: string, amount?: number, category?: string, wallet_id?: string, walletName?: string, to_wallet_id?: string, toWalletName?: string, custom_time?: "YYYY-MM-DD HH:mm" }
     e5) "delete_transaction": Xóa giao dịch ĐÃ CÓ và hoàn lại số dư ví tương ứng.
        - Fields: { actionType: "delete_transaction", transaction_id: string, description: string, amount?: number }
     f) "create_task": Tạo Quest mới.
        - Fields: { actionType: "create_task", title: string, description: string, quest_rank: "S"|"A"|"B"|"C"|"D", due_date: "YYYY-MM-DD HH:mm" }
     g) "complete_task": Hoàn thành Quest đã có.
        - Fields: { actionType: "complete_task", task_id: string, title: string }
     g2) "update_task": Sửa Quest, đổi deadline, đổi rank, chuyển "IN_PROGRESS", hoặc hoàn tác "COMPLETED" -> "PENDING".
        - Fields: { actionType: "update_task", task_id: string, original_title?: string, title?: string, description?: string, status?: "PENDING"|"IN_PROGRESS"|"COMPLETED", quest_rank?: "S"|"A"|"B"|"C"|"D", due_date?: "YYYY-MM-DD HH:mm" }
     g3) "delete_task": Xóa Quest đã có.
        - Fields: { actionType: "delete_task", task_id: string, title: string }
     h) "create_calendar_event": Thêm sự kiện lịch trình (hỗ trợ cả sự kiện đơn lẫn lịch lặp định kỳ).
        - Fields: { actionType: "create_calendar_event", title: string, description: string, start_time: "YYYY-MM-DD HH:mm", end_time: "YYYY-MM-DD HH:mm", color_code: "#00f0ff"|"#ffaa00"|"#ff4444"|"#b900ff", is_recurring?: boolean, recurrence_type?: "DAILY"|"WEEKLY"|"MONTHLY"|"YEARLY", recurrence_days?: number[], recurrence_end?: "YYYY-MM-DD" }
     h2) "update_calendar_event": Dời giờ/ngày, đổi tên hoặc sửa lịch trình đã có (dùng scope="single" nếu sửa 1 buổi lịch lặp, "series" nếu sửa cả chuỗi).
        - Fields: { actionType: "update_calendar_event", event_id: string, parent_event_id?: string, exception_date?: string, scope?: "single"|"series", title?: string, description?: string, start_time?: "YYYY-MM-DD HH:mm", end_time?: "YYYY-MM-DD HH:mm", color_code?: string }
     h3) "delete_calendar_event": Hủy/Xóa sự kiện hoặc tạm nghỉ 1 buổi của lịch lặp.
        - Fields: { actionType: "delete_calendar_event", event_id: string, parent_event_id?: string, exception_date?: string, scope?: "single"|"series", title: string }
     i) "create_shopping_item": Thêm món cần mua vào danh sách shopping.
        - Fields: { actionType: "create_shopping_item", name: string, quantity: number, unit: string, category: "food"|"household"|"other" }
     i2) "purchase_shopping": Đánh dấu đã mua món từ danh sách shopping -> cất vào Kho đồ -> trừ ví nếu có giá tiền.
        - Fields: { actionType: "purchase_shopping", shopping_item_id?: string, name: string, quantity: number, unit: string, inventory_category?: "food"|"spices"|"utilities", add_to_inventory?: boolean, amount?: number, wallet_id?: string, walletName?: string, expiryDate?: "YYYY-MM-DD", custom_time: "YYYY-MM-DD HH:mm" }
     j) "create_inventory": Thêm đồ mới trực tiếp vào kho đồ / tủ lạnh (chỉ trừ ví khi KHÔNG qua "purchase_shopping").
        - Fields: { actionType: "create_inventory", name: string, quantity: number, unit: string, category: string, custom_time: "YYYY-MM-DD HH:mm", expiryDate?: "YYYY-MM-DD" }
     j2) "update_inventory": Tiêu hao, thêm/bớt số lượng, sửa HSD hoặc bỏ/dùng hết đồ đang có trong "kho_do_hien_co".
        - Fields: { actionType: "update_inventory", inv_id: string, name: string, operation: "set"|"deduct"|"add"|"discard", quantity?: number, delta_quantity?: number, unit?: string, expiryDate?: "YYYY-MM-DD", custom_time: "YYYY-MM-DD HH:mm" }
     k) "record_weight": Ghi nhận / Cập nhật cân nặng và chiều cao.
        - Fields: { actionType: "record_weight", weight: number, height?: number, custom_time: "YYYY-MM-DD HH:mm", description: "Cập nhật cân nặng" }
     l) "create_recipe": Tạo hoặc lưu công thức nấu ăn mới vào Thực Đơn.
        - Fields: { actionType: "create_recipe", name: string, ingredients: string[], instructions: string }

YÊU CẦU TRẢ VỀ:
Trả về DUY NHẤT một chuỗi JSON hợp lệ không bọc thêm bất kỳ văn bản nào ngoài JSON:
{
  "summary": "Tóm tắt ngắn gọn các hành động chuẩn bị thực hiện",
  "reply": "Câu trả lời thân mật của Yui gửi Papa (BẮT BUỘC khi actions rỗng; khi có actions thì giải thích kế hoạch để Papa xác nhận)",
  "actions": [ ... ]
}`;

  const aiRaw = await generateContentWithFallback(
    prompt,
    hasImage ? imageData : undefined,
    true,
    hasImage ? 15000 : 10000
  );
  const parsed = extractJsonFromAiResponse(aiRaw);
  if (parsed && Array.isArray(parsed.actions)) {
    parsed.actions = normalizeYuiActions(parsed.actions, now);
  }
  return parsed;
}

function matchByNormalizedName<T>(
  items: T[],
  targetName: unknown,
  getName: (item: T) => string
): T | null {
  if (typeof targetName !== 'string' || !targetName.trim() || items.length === 0) return null;
  const target = normalizeVietnamese(targetName);
  if (!target) return null;

  const exact = items.find((item) => normalizeVietnamese(getName(item)) === target);
  if (exact) return exact;

  const partial = items.find((item) => {
    const candidate = normalizeVietnamese(getName(item));
    return candidate.includes(target) || target.includes(candidate);
  });
  return partial ?? null;
}

async function resolveUserWallet(
  userId: string,
  walletId?: unknown,
  walletName?: unknown,
  fallbackToSingle: boolean = false
) {
  if (typeof walletId === 'string' && mongoose.Types.ObjectId.isValid(walletId)) {
    const byId = await Wallet.findOne({ _id: walletId, user_id: userId });
    if (byId) return byId;
  }

  const allWallets = await Wallet.find({ user_id: userId });
  const byName = matchByNormalizedName(allWallets, walletName, (w) => w.name);
  if (byName) return byName;

  if (fallbackToSingle && allWallets.length === 1) {
    return allWallets[0];
  }
  return null;
}

async function deductInventoryForHomeMeal(
  userId: string,
  rawIngredients: Array<{ invId?: unknown; name?: unknown; qty?: unknown; quantity?: unknown }>
) {
  const userInventory = await Inventory.find({ user_id: userId, quantity: { $gt: 0 } });
  const mergedQty = new Map<string, number>();

  for (const ing of rawIngredients) {
    if (!ing || typeof ing !== 'object') continue;
    const qtyNum = Number(ing.qty ?? ing.quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) continue;

    let invItem: (typeof userInventory)[number] | null = null;
    if (typeof ing.invId === 'string' && mongoose.Types.ObjectId.isValid(ing.invId)) {
      invItem = userInventory.find((i) => i._id.toString() === ing.invId) ?? null;
    }
    if (!invItem && ing.name) {
      invItem = matchByNormalizedName(userInventory, ing.name, (i) => i.name);
    }
    if (!invItem) {
      throw new Error(`Không tìm thấy nguyên liệu "${ing.name || '?'}" còn tồn trong kho để trừ kho`);
    }

    const idStr = invItem._id.toString();
    mergedQty.set(idStr, Number(((mergedQty.get(idStr) || 0) + qtyNum).toFixed(4)));
  }

  // Pass 1: Validate tồn kho toàn bộ trước khi trừ
  const itemsToDeduct: Array<{ item: (typeof userInventory)[number]; qty: number }> = [];
  for (const [invId, qty] of mergedQty.entries()) {
    const item = userInventory.find((i) => i._id.toString() === invId);
    if (!item || item.quantity <= 0) {
      throw new Error(`Nguyên liệu "${item?.name || '?'}" trong kho đã dùng hết`);
    }
    if (qty > item.quantity + 1e-6) {
      throw new Error(
        `Nguyên liệu "${item.name}" trong kho chỉ còn ${item.quantity} ${item.unit} (không đủ ${qty} ${item.unit})`
      );
    }
    itemsToDeduct.push({ item, qty: Math.min(item.quantity, qty) });
  }

  // Pass 2: Trừ số lượng và giá trị kho tương ứng
  let totalInventoryCost = 0;
  const processedIngredientsUsed: {
    invId: string;
    qty: number;
    cost: number;
    name: string;
    unit: string;
  }[] = [];

  for (const { item, qty } of itemsToDeduct) {
    if (!item.originalValue && item.totalValue && item.totalValue > 0 && item.quantity === item.originalQuantity) {
      item.originalValue = item.totalValue;
    }

    let valueToDeduct = 0;
    if (item.totalValue && item.totalValue > 0 && item.quantity > 0) {
      if (qty >= item.quantity - 1e-6) {
        valueToDeduct = Math.round(item.totalValue);
      } else {
        const valuePerUnit = item.totalValue / item.quantity;
        valueToDeduct = Math.min(Math.round(item.totalValue), Math.round(valuePerUnit * qty));
      }
      item.totalValue = Math.max(0, Math.round(item.totalValue - valueToDeduct));
      totalInventoryCost += valueToDeduct;
    }

    item.quantity = Math.max(0, Number((item.quantity - qty).toFixed(4)));
    await item.save();

    processedIngredientsUsed.push({
      invId: item._id.toString(),
      qty,
      cost: valueToDeduct,
      name: item.name,
      unit: item.unit
    });
  }

  return { totalInventoryCost, processedIngredientsUsed };
}

async function applyTaskCompletionReward(userId: string, task: any, completedAt: Date) {
  task.status = 'COMPLETED';
  task.completed_at = completedAt;
  await task.save();

  const user = await User.findById(userId);
  const rewardExp = EXP_REWARDS[task.quest_rank as keyof typeof EXP_REWARDS] || 50;
  let leveledUp = false;

  if (user) {
    user.current_exp += rewardExp;
    let requiredExp = getExpForNextLevel(user.level);
    while (user.current_exp >= requiredExp) {
      user.current_exp -= requiredExp;
      user.level += 1;
      leveledUp = true;
      requiredExp = getExpForNextLevel(user.level);
    }

    const mpReward = Math.floor(Math.random() * 21) + 40;
    user.current_mp = Math.min(user.max_mp, user.current_mp + mpReward);
    await user.save();
  }

  return { rewardExp, leveledUp };
}

async function applyTaskUndoPenalty(userId: string, task: any) {
  task.status = 'PENDING';
  task.completed_at = undefined;
  await task.save();

  const user = await User.findById(userId);
  const penaltyExp = EXP_REWARDS[task.quest_rank as keyof typeof EXP_REWARDS] || 50;
  if (user) {
    user.current_exp -= penaltyExp;
    while (user.current_exp < 0 && user.level > 1) {
      user.level -= 1;
      user.current_exp += getExpForNextLevel(user.level);
    }
    if (user.current_exp < 0) user.current_exp = 0;
    if (user.current_hp > user.max_hp) user.current_hp = user.max_hp;
    if (user.current_mp > user.max_mp) user.current_mp = user.max_mp;
    await user.save();
  }
  return penaltyExp;
}

async function findTargetTask(userId: string, action: any) {
  if (typeof action.task_id === 'string' && mongoose.Types.ObjectId.isValid(action.task_id)) {
    const byId = await Task.findOne({ _id: action.task_id, user_id: userId });
    if (byId) return byId;
  }
  const searchTitle = action.original_title || action.title;
  if (typeof searchTitle === 'string' && searchTitle.trim()) {
    const userTasks = await Task.find({ user_id: userId }).sort({ createdAt: -1 }).limit(50);
    const cleaned = cleanTemporalWords(searchTitle) || searchTitle;
    return matchByNormalizedName(userTasks, cleaned, (t) => t.title);
  }
  return null;
}

async function findTargetDebt(userId: string, action: any) {
  if (typeof action.debt_id === 'string' && mongoose.Types.ObjectId.isValid(action.debt_id)) {
    const byId = await Debt.findOne({ _id: action.debt_id, user_id: userId, status: { $ne: 'paid' } });
    if (byId) return byId;
  }
  const openDebts = await Debt.find({ user_id: userId, status: { $ne: 'paid' } }).sort({ createdAt: -1 });
  const typedDebts = action.debt_type === 'lent' || action.debt_type === 'borrowed'
    ? openDebts.filter((d) => d.type === action.debt_type)
    : openDebts;
  const matched = matchByNormalizedName(typedDebts, action.person, (d) => d.personName);
  if (matched) return matched;
  return matchByNormalizedName(openDebts, action.person, (d) => d.personName);
}

async function resolveCalendarTarget(userId: string, action: any) {
  const rawEventId = typeof action.event_id === 'string' ? action.event_id.trim() : '';
  let baseDoc: any = null;
  let compositeOccDate: Date | null = null;

  if (rawEventId.includes('_')) {
    const sepIdx = rawEventId.indexOf('_');
    const parentId = rawEventId.slice(0, sepIdx);
    const isoPart = rawEventId.slice(sepIdx + 1);
    if (mongoose.Types.ObjectId.isValid(parentId)) {
      baseDoc = await CalendarEvent.findOne({ _id: parentId, user_id: userId });
    }
    const parsedIso = new Date(isoPart);
    if (!isNaN(parsedIso.getTime())) {
      compositeOccDate = parsedIso;
    }
  } else if (mongoose.Types.ObjectId.isValid(rawEventId)) {
    baseDoc = await CalendarEvent.findOne({ _id: rawEventId, user_id: userId });
  }

  if (!baseDoc && typeof action.parent_event_id === 'string' && mongoose.Types.ObjectId.isValid(action.parent_event_id)) {
    baseDoc = await CalendarEvent.findOne({ _id: action.parent_event_id, user_id: userId });
  }

  if (!baseDoc && (action.original_title || action.title)) {
    const userEvents = await CalendarEvent.find({
      user_id: userId,
      is_cancelled: { $ne: true }
    }).sort({ start_time: 1 });
    const searchTitle = cleanTemporalWords(action.original_title || action.title) || action.title;
    baseDoc = matchByNormalizedName(userEvents, searchTitle, (e) => e.title);
  }

  if (!baseDoc) return null;

  let occurrenceStart: Date | null = compositeOccDate;
  if (!occurrenceStart && baseDoc.is_recurring && action.scope !== 'series') {
    const hint = action.exception_date || action.start_time;
    const parsedHint = parseVnDateTime(hint, '09:00:00');
    if (parsedHint) {
      const hintVn = getVnDateStr(parsedHint);
      const rangeStart = new Date(parsedHint.getTime() - 2 * 86400000);
      const rangeEnd = new Date(parsedHint.getTime() + 2 * 86400000);
      const expanded = await getExpandedCalendarEvents(userId, rangeStart, rangeEnd);
      const matchOcc = (expanded as any[]).find((ev) => {
        const pId = ev.parent_event_id?.toString() || ev._id?.toString();
        return pId === baseDoc._id.toString() && getVnDateStr(ev.start_time) === hintVn;
      });
      if (matchOcc) {
        occurrenceStart = new Date(matchOcc.start_time);
      }
    }
  }

  return { baseDoc, occurrenceStart };
}

async function revertTransactionWalletEffect(userId: string, tx: any): Promise<boolean> {
  const { type, amount, wallet_id, to_wallet_id } = tx;
  if (type === 'income' && wallet_id) {
    const w = await Wallet.findOneAndUpdate(
      { _id: wallet_id, user_id: userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } }
    );
    return Boolean(w);
  }
  if (type === 'expense' && wallet_id) {
    await Wallet.findOneAndUpdate(
      { _id: wallet_id, user_id: userId },
      { $inc: { balance: amount } }
    );
    return true;
  }
  if (type === 'transfer' && wallet_id && to_wallet_id) {
    const dest = await Wallet.findOneAndUpdate(
      { _id: to_wallet_id, user_id: userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } }
    );
    if (!dest) return false;
    await Wallet.findOneAndUpdate(
      { _id: wallet_id, user_id: userId },
      { $inc: { balance: amount } }
    );
    return true;
  }
  return true;
}

async function rollbackTransactionWalletRevert(userId: string, oldTx: any) {
  const { type, amount, wallet_id, to_wallet_id } = oldTx;
  if (type === 'income' && wallet_id) {
    await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: userId }, { $inc: { balance: amount } });
  } else if (type === 'expense' && wallet_id) {
    await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: userId }, { $inc: { balance: -amount } });
  } else if (type === 'transfer' && wallet_id && to_wallet_id) {
    await Wallet.findOneAndUpdate({ _id: to_wallet_id, user_id: userId }, { $inc: { balance: amount } });
    await Wallet.findOneAndUpdate({ _id: wallet_id, user_id: userId }, { $inc: { balance: -amount } });
  }
}

/**
 * Thực thi các hành động đã được người dùng xác nhận trên giao diện.
 */
export async function executeYuiActions(userId: string, actions: any[]) {
  await dbConnect();
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    throw new Error('Danh sách hành động không hợp lệ');
  }

  const executedResults: any[] = [];
  const now = new Date();

  for (const action of actions) {
    const actionType = action.actionType;

    // Trích xuất ngày giờ tùy chỉnh chuẩn múi giờ Việt Nam (+07:00)
    const actionDate = parseVnDateTime(action.custom_time, '12:00:00') ?? now;

    // 1. MEAL (Hỗ trợ cả Ăn ngoài lẫn Tự nấu trừ Kho)
    if (actionType === 'meal') {
      const cashAmount = Math.max(0, Number(action.amount) || 0);
      const isHomeCook = action.source === 'home';
      let txId: any = undefined;
      let resolvedWallet: any = null;
      let calculatedInventoryCost = 0;
      let processedIngredientsUsed: any[] | undefined = undefined;

      const rawFoodName = action.food_name || action.description || 'Món ăn';
      const cleanFoodName = capitalizeFirst(cleanTemporalWords(rawFoodName)) || 'Bữa ăn';

      if (isHomeCook && Array.isArray(action.ingredients_used) && action.ingredients_used.length > 0) {
        const invDeduct = await deductInventoryForHomeMeal(userId, action.ingredients_used);
        calculatedInventoryCost = invDeduct.totalInventoryCost;
        processedIngredientsUsed = invDeduct.processedIngredientsUsed;
      }

      if (cashAmount > 0) {
        resolvedWallet = await resolveUserWallet(userId, action.wallet_id, action.walletName);
        if (resolvedWallet) {
          await Wallet.findOneAndUpdate(
            { _id: resolvedWallet._id, user_id: userId },
            { $inc: { balance: -cashAmount } }
          );
        }
        const tx = await Transaction.create({
          user_id: userId,
          type: 'expense',
          amount: cashAmount,
          date: actionDate,
          description: `Ăn uống: ${cleanFoodName}`,
          category: 'food',
          wallet_id: resolvedWallet?._id || action.wallet_id || undefined,
          walletName: resolvedWallet?.name || action.walletName || 'Ví không xác định'
        });
        txId = tx._id;
      }

      const calo = Math.max(0, Number(action.calo) || 0);
      const hp = Math.floor(calo * 1.0);
      const tier = ['HEAVY', 'LIGHT', 'DRINK'].includes(action.meal_tier) ? action.meal_tier : 'LIGHT';
      const totalMealCost = (isHomeCook ? calculatedInventoryCost : 0) + cashAmount;
      const aiDesc = action.ai_description?.trim() || `Khẩu phần tiêu chuẩn: ${cleanFoodName}. Ước tính cung cấp khoảng ${calo} kcal.`;

      const meal = await MealLog.create({
        user_id: userId,
        food_name: cleanFoodName,
        meal_tier: tier,
        hp_restored: hp,
        consumed_at: actionDate,
        calo,
        protein: Number(action.protein) || 0,
        fat: Number(action.fat) || 0,
        carbs: Number(action.carbs) || 0,
        sugar: Number(action.sugar) || 0,
        cost: totalMealCost,
        ai_status: 'completed',
        ai_description: aiDesc,
        source: isHomeCook ? 'home' : 'eat_out',
        ingredients_used: isHomeCook && processedIngredientsUsed ? processedIngredientsUsed : undefined,
        transaction_id: txId,
        wallet_id: cashAmount > 0 ? (resolvedWallet?._id || action.wallet_id) : undefined
      });

      const user = await User.findById(userId);
      if (user) {
        user.current_hp = Math.min(user.max_hp, user.current_hp + hp);
        await user.save();
      }

      executedResults.push({
        type: 'meal',
        id: meal._id,
        food_name: meal.food_name,
        source: meal.source,
        amount: totalMealCost,
        hp,
        walletName: resolvedWallet?.name || action.walletName
      });
      continue;
    }

    // 2. EXPENSE
    if (actionType === 'expense') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const rawDesc = action.description || 'Chi tiêu';
      const cleanDesc = capitalizeFirst(cleanTemporalWords(rawDesc)) || 'Chi tiêu';
      const resolvedWallet = await resolveUserWallet(userId, action.wallet_id, action.walletName);

      if (resolvedWallet) {
        await Wallet.findOneAndUpdate(
          { _id: resolvedWallet._id, user_id: userId },
          { $inc: { balance: -amount } }
        );
      }

      const tx = await Transaction.create({
        user_id: userId,
        type: 'expense',
        amount,
        date: actionDate,
        description: cleanDesc,
        category: action.category || 'other',
        wallet_id: resolvedWallet?._id || action.wallet_id || undefined,
        walletName: resolvedWallet?.name || action.walletName || 'Ví không xác định'
      });

      executedResults.push({
        type: 'expense',
        id: tx._id,
        amount,
        description: tx.description,
        walletName: tx.walletName
      });
      continue;
    }

    // 3. INCOME
    if (actionType === 'income') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const rawDesc = action.description || 'Thu nhập';
      const cleanDesc = capitalizeFirst(cleanTemporalWords(rawDesc)) || 'Thu nhập';
      const resolvedWallet = await resolveUserWallet(userId, action.wallet_id, action.walletName);

      if (resolvedWallet) {
        await Wallet.findOneAndUpdate(
          { _id: resolvedWallet._id, user_id: userId },
          { $inc: { balance: amount } }
        );
      }

      const tx = await Transaction.create({
        user_id: userId,
        type: 'income',
        amount,
        date: actionDate,
        description: cleanDesc,
        category: action.category || 'other',
        wallet_id: resolvedWallet?._id || action.wallet_id || undefined,
        walletName: resolvedWallet?.name || action.walletName || 'Ví không xác định'
      });

      executedResults.push({
        type: 'income',
        id: tx._id,
        amount,
        description: tx.description,
        walletName: tx.walletName
      });
      continue;
    }

    // 3b. TRANSFER (Chuyển tiền giữa các ví nội bộ)
    if (actionType === 'transfer') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const sourceWallet = await resolveUserWallet(userId, action.wallet_id, action.walletName);
      const destWallet = await resolveUserWallet(
        userId,
        action.to_wallet_id || action.toWalletId,
        action.toWalletName || action.to_wallet_name
      );

      if (!sourceWallet || !destWallet) {
        throw new Error('Không tìm thấy ví nguồn hoặc ví đích để thực hiện chuyển khoản');
      }
      if (sourceWallet._id.toString() === destWallet._id.toString()) {
        throw new Error('Ví nguồn và ví đích phải khác nhau khi chuyển khoản');
      }

      const deductedSource = await Wallet.findOneAndUpdate(
        { _id: sourceWallet._id, user_id: userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { returnDocument: 'after' }
      );
      if (!deductedSource) {
        throw new Error(`Số dư ví "${sourceWallet.name}" không đủ để chuyển ${amount.toLocaleString('vi-VN')}đ`);
      }

      const creditedDest = await Wallet.findOneAndUpdate(
        { _id: destWallet._id, user_id: userId },
        { $inc: { balance: amount } },
        { returnDocument: 'after' }
      );
      if (!creditedDest) {
        await Wallet.findByIdAndUpdate(sourceWallet._id, { $inc: { balance: amount } });
        throw new Error('Ví đích không tồn tại, đã hoàn lại số dư ví nguồn');
      }

      const rawDesc = action.description || `Chuyển khoản: ${sourceWallet.name} -> ${destWallet.name}`;
      const cleanDesc = capitalizeFirst(cleanTemporalWords(rawDesc)) || `Chuyển khoản: ${sourceWallet.name} -> ${destWallet.name}`;
      const combinedWalletName = `${sourceWallet.name} -> ${destWallet.name}`;

      const tx = await Transaction.create({
        user_id: userId,
        type: 'transfer',
        amount,
        date: actionDate,
        description: cleanDesc,
        wallet_id: sourceWallet._id,
        to_wallet_id: destWallet._id,
        walletName: combinedWalletName
      });

      executedResults.push({
        type: 'transfer',
        id: tx._id,
        amount,
        description: tx.description,
        walletName: combinedWalletName
      });
      continue;
    }

    // 4. DEBT LENT (Cho vay / Trả hộ)
    if (actionType === 'debt_lent') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const cleanDesc = cleanTemporalWords(action.description || '');
      const resolvedWallet = await resolveUserWallet(userId, action.wallet_id, action.walletName);

      if (resolvedWallet) {
        await Wallet.findOneAndUpdate(
          { _id: resolvedWallet._id, user_id: userId },
          { $inc: { balance: -amount } }
        );
        await Transaction.create({
          user_id: userId,
          type: 'expense',
          amount,
          date: actionDate,
          description: `Trả hộ / Cho vay: ${action.person || 'Khác'}${cleanDesc ? ` - ${cleanDesc}` : ''}`,
          category: 'other',
          wallet_id: resolvedWallet._id,
          walletName: resolvedWallet.name
        });
      }

      const debt = await Debt.create({
        user_id: userId,
        personName: action.person || 'Người quen',
        type: 'lent',
        status: 'unpaid',
        totalAmount: amount,
        remainingAmount: amount,
        history: [{
          date: actionDate,
          amount,
          type: 'borrow_more',
          walletName: resolvedWallet?.name || action.walletName || 'Tiền mặt'
        }]
      });

      executedResults.push({
        type: 'debt_lent',
        id: debt._id,
        amount,
        person: debt.personName,
        walletName: resolvedWallet?.name || action.walletName
      });
      continue;
    }

    // 5. DEBT BORROWED (Đi vay)
    if (actionType === 'debt_borrowed') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const cleanDesc = cleanTemporalWords(action.description || '');
      const resolvedWallet = await resolveUserWallet(userId, action.wallet_id, action.walletName);

      if (resolvedWallet) {
        await Wallet.findOneAndUpdate(
          { _id: resolvedWallet._id, user_id: userId },
          { $inc: { balance: amount } }
        );
        await Transaction.create({
          user_id: userId,
          type: 'income',
          amount,
          date: actionDate,
          description: `Đi vay: ${action.person || 'Khác'}${cleanDesc ? ` - ${cleanDesc}` : ''}`,
          category: 'other',
          wallet_id: resolvedWallet._id,
          walletName: resolvedWallet.name
        });
      }

      const debt = await Debt.create({
        user_id: userId,
        personName: action.person || 'Chủ nợ',
        type: 'borrowed',
        status: 'unpaid',
        totalAmount: amount,
        remainingAmount: amount,
        history: [{
          date: actionDate,
          amount,
          type: 'borrow_more',
          walletName: resolvedWallet?.name || action.walletName || 'Tiền mặt'
        }]
      });

      executedResults.push({
        type: 'debt_borrowed',
        id: debt._id,
        amount,
        person: debt.personName,
        walletName: resolvedWallet?.name || action.walletName
      });
      continue;
    }

    // 5b. PAY DEBT (Thu nợ / Trả bớt / Tất toán sổ nợ có sẵn)
    if (actionType === 'pay_debt') {
      const payAmount = Number(action.amount) || 0;
      if (payAmount <= 0) {
        throw new Error('Số tiền thu/trả nợ phải lớn hơn 0');
      }

      const debt = await findTargetDebt(userId, action);
      if (!debt) {
        throw new Error(`Không tìm thấy khoản nợ chưa tất toán với "${action.person || 'đối tượng'}"`);
      }
      if (payAmount > debt.remainingAmount) {
        throw new Error(
          `Số tiền ${payAmount.toLocaleString('vi-VN')}đ vượt quá số nợ còn lại với ${debt.personName} (${debt.remainingAmount.toLocaleString('vi-VN')}đ)`
        );
      }

      const wallet = await resolveUserWallet(userId, action.wallet_id, action.walletName, true);
      if (!wallet) {
        throw new Error('Vui lòng chọn hoặc nêu rõ ví để thu/trả nợ');
      }

      let transactionType: 'income' | 'expense';
      let txDesc: string;

      if (debt.type === 'lent') {
        await Wallet.findOneAndUpdate(
          { _id: wallet._id, user_id: userId },
          { $inc: { balance: payAmount } }
        );
        transactionType = 'income';
        txDesc = `${debt.personName} trả tiền nợ`;
      } else {
        const deducted = await Wallet.findOneAndUpdate(
          { _id: wallet._id, user_id: userId, balance: { $gte: payAmount } },
          { $inc: { balance: -payAmount } },
          { returnDocument: 'after' }
        );
        if (!deducted) {
          throw new Error(`Số dư ví "${wallet.name}" không đủ để trả nợ ${payAmount.toLocaleString('vi-VN')}đ`);
        }
        transactionType = 'expense';
        txDesc = `Trả tiền nợ cho ${debt.personName}`;
      }

      debt.remainingAmount = Math.max(0, debt.remainingAmount - payAmount);
      if (debt.remainingAmount === 0) {
        debt.status = 'paid';
        debt.completedDate = actionDate;
      } else {
        debt.status = 'partial';
      }
      debt.history.push({
        date: actionDate,
        amount: payAmount,
        type: 'pay_back',
        walletName: wallet.name
      } as any);
      await debt.save();

      await Transaction.create({
        user_id: userId,
        type: transactionType,
        amount: payAmount,
        date: actionDate,
        description: txDesc,
        category: 'other',
        wallet_id: wallet._id,
        walletName: wallet.name
      });

      executedResults.push({
        type: 'pay_debt',
        id: debt._id,
        person: debt.personName,
        debt_type: debt.type,
        amount: payAmount,
        remainingAmount: debt.remainingAmount,
        status: debt.status,
        walletName: wallet.name
      });
      continue;
    }

    // 5c. UPSERT BUDGET (Đặt / Sửa hạn mức chi tiêu tháng)
    if (actionType === 'upsert_budget') {
      const category = FINANCE_CATEGORY_DEFAULT_NAMES[action.category] ? action.category : 'other';
      const limit = Number(action.limit);
      if (isNaN(limit) || limit < 0) {
        throw new Error('Hạn mức ngân sách không hợp lệ');
      }

      const month = typeof action.month === 'string' && /^\d{4}-\d{2}$/.test(action.month.trim())
        ? action.month.trim()
        : getVnDateStr(now).slice(0, 7);
      const defaultName = FINANCE_CATEGORY_DEFAULT_NAMES[category] || 'Ngân sách';
      const cleanName = action.name?.trim() || defaultName;

      const existing = await Budget.findOne({ user_id: userId, category, month });
      let budget: any;
      if (existing) {
        existing.limit = limit;
        if (action.name?.trim()) existing.name = action.name.trim();
        budget = await existing.save();
      } else {
        budget = await Budget.create({
          user_id: userId,
          name: cleanName,
          category,
          month,
          limit
        });
      }

      executedResults.push({
        type: 'upsert_budget',
        id: budget._id,
        name: budget.name,
        category: budget.category,
        month: budget.month,
        limit: budget.limit
      });
      continue;
    }

    // 5d. UPDATE TRANSACTION (Sửa giao dịch gần đây + cân chỉnh lại số dư ví an toàn)
    if (actionType === 'update_transaction') {
      if (typeof action.transaction_id !== 'string' || !mongoose.Types.ObjectId.isValid(action.transaction_id)) {
        throw new Error('Không xác định được giao dịch cần sửa');
      }
      const oldTx = await Transaction.findOne({ _id: action.transaction_id, user_id: userId });
      if (!oldTx) {
        throw new Error('Giao dịch không tồn tại hoặc đã bị xóa');
      }

      const newAmount = action.amount !== undefined ? Number(action.amount) : oldTx.amount;
      if (isNaN(newAmount) || newAmount <= 0) {
        throw new Error('Số tiền giao dịch mới phải lớn hơn 0');
      }

      const newDesc = action.description
        ? capitalizeFirst(cleanTemporalWords(action.description)) || oldTx.description
        : oldTx.description;
      const newCategory = action.category !== undefined ? action.category : oldTx.category;
      const newDate = action.custom_time ? (parseVnDateTime(action.custom_time, '12:00:00') ?? oldTx.date) : oldTx.date;

      const targetWallet = await resolveUserWallet(userId, action.wallet_id ?? oldTx.wallet_id?.toString(), action.walletName);
      const targetToWallet = oldTx.type === 'transfer'
        ? await resolveUserWallet(userId, action.to_wallet_id ?? oldTx.to_wallet_id?.toString(), action.toWalletName)
        : null;

      if (oldTx.type === 'transfer') {
        if (!targetWallet || !targetToWallet || targetWallet._id.toString() === targetToWallet._id.toString()) {
          throw new Error('Thông tin ví nguồn/đích của giao dịch chuyển khoản không hợp lệ');
        }
      }

      const reverted = await revertTransactionWalletEffect(userId, oldTx);
      if (!reverted) {
        throw new Error('Không thể sửa do số dư ví hiện tại không đủ để hoàn tác giao dịch cũ');
      }

      let newWalletName = oldTx.walletName;
      if (oldTx.type === 'income' && targetWallet) {
        const w = await Wallet.findOneAndUpdate(
          { _id: targetWallet._id, user_id: userId },
          { $inc: { balance: newAmount } },
          { returnDocument: 'after' }
        );
        if (!w) {
          await rollbackTransactionWalletRevert(userId, oldTx);
          throw new Error('Không tìm thấy ví áp dụng');
        }
        newWalletName = w.name;
      } else if (oldTx.type === 'expense' && targetWallet) {
        const w = await Wallet.findOneAndUpdate(
          { _id: targetWallet._id, user_id: userId, balance: { $gte: newAmount } },
          { $inc: { balance: -newAmount } },
          { returnDocument: 'after' }
        );
        if (!w) {
          await rollbackTransactionWalletRevert(userId, oldTx);
          throw new Error(`Số dư ví "${targetWallet.name}" không đủ cho mức tiền mới ${newAmount.toLocaleString('vi-VN')}đ`);
        }
        newWalletName = w.name;
      } else if (oldTx.type === 'transfer' && targetWallet && targetToWallet) {
        const src = await Wallet.findOneAndUpdate(
          { _id: targetWallet._id, user_id: userId, balance: { $gte: newAmount } },
          { $inc: { balance: -newAmount } },
          { returnDocument: 'after' }
        );
        if (!src) {
          await rollbackTransactionWalletRevert(userId, oldTx);
          throw new Error(`Số dư ví "${targetWallet.name}" không đủ`);
        }
        const dst = await Wallet.findOneAndUpdate(
          { _id: targetToWallet._id, user_id: userId },
          { $inc: { balance: newAmount } },
          { returnDocument: 'after' }
        );
        if (!dst) {
          await Wallet.findByIdAndUpdate(targetWallet._id, { $inc: { balance: newAmount } });
          await rollbackTransactionWalletRevert(userId, oldTx);
          throw new Error('Ví đích không tồn tại');
        }
        newWalletName = `${src.name} -> ${dst.name}`;
      }

      oldTx.amount = newAmount;
      oldTx.description = newDesc;
      oldTx.category = newCategory;
      oldTx.date = newDate;
      if (targetWallet) oldTx.wallet_id = targetWallet._id;
      if (targetToWallet) oldTx.to_wallet_id = targetToWallet._id;
      oldTx.walletName = newWalletName;
      await oldTx.save();

      executedResults.push({
        type: 'update_transaction',
        id: oldTx._id,
        amount: oldTx.amount,
        description: oldTx.description,
        walletName: oldTx.walletName
      });
      continue;
    }

    // 5e. DELETE TRANSACTION (Xóa giao dịch và hoàn trả số dư ví)
    if (actionType === 'delete_transaction') {
      if (typeof action.transaction_id !== 'string' || !mongoose.Types.ObjectId.isValid(action.transaction_id)) {
        throw new Error('Không xác định được giao dịch cần xóa');
      }
      const tx = await Transaction.findOne({ _id: action.transaction_id, user_id: userId });
      if (!tx) {
        throw new Error('Giao dịch không tồn tại hoặc đã bị xóa');
      }

      const reverted = await revertTransactionWalletEffect(userId, tx);
      if (!reverted) {
        throw new Error('Không thể hủy do ví không đủ số dư để hoàn trả giao dịch này');
      }

      await Transaction.deleteOne({ _id: tx._id, user_id: userId });

      executedResults.push({
        type: 'delete_transaction',
        id: tx._id,
        amount: tx.amount,
        description: tx.description
      });
      continue;
    }

    // 6. CREATE TASK / QUEST
    if (actionType === 'create_task') {
      const rawTitle = action.title?.trim() || 'Nhiệm vụ mới';
      const cleanTitle = capitalizeFirst(cleanTemporalWords(rawTitle)) || 'Nhiệm vụ mới';
      const questRank = ['S', 'A', 'B', 'C', 'D'].includes(action.quest_rank) ? action.quest_rank : 'C';
      const defaultDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dueDate = parseVnDateTime(action.due_date, '23:59:00') ?? defaultDue;

      const task = await Task.create({
        user_id: userId,
        title: cleanTitle,
        description: action.description || '',
        quest_rank: questRank,
        due_date: dueDate,
        status: 'PENDING',
      });

      executedResults.push({
        type: 'create_task',
        id: task._id,
        title: task.title,
        quest_rank: task.quest_rank
      });
      continue;
    }

    // 7. COMPLETE TASK / QUEST
    if (actionType === 'complete_task') {
      const task = await findTargetTask(userId, action);
      if (!task) {
        throw new Error(`Không tìm thấy Quest "${action.title || ''}" để hoàn thành`);
      }

      if (task.status !== 'COMPLETED') {
        const { rewardExp, leveledUp } = await applyTaskCompletionReward(userId, task, actionDate);
        executedResults.push({
          type: 'complete_task',
          id: task._id,
          title: task.title,
          exp: rewardExp,
          leveledUp
        });
      }
      continue;
    }

    // 7b. UPDATE TASK / QUEST (Sửa tiêu đề, rank, deadline, chuyển trạng thái hoặc hoàn tác)
    if (actionType === 'update_task') {
      const task = await findTargetTask(userId, action);
      if (!task) {
        throw new Error(`Không tìm thấy Quest "${action.original_title || action.title || ''}" để cập nhật`);
      }

      const prevStatus = task.status;
      const nextStatus = ['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(action.status) ? action.status : undefined;

      if (action.title && action.title.trim()) {
        task.title = capitalizeFirst(cleanTemporalWords(action.title.trim())) || task.title;
      }
      if (action.description !== undefined) {
        task.description = String(action.description);
      }
      if (['S', 'A', 'B', 'C', 'D'].includes(action.quest_rank)) {
        task.quest_rank = action.quest_rank;
      }
      if (action.due_date) {
        const newDue = parseVnDateTime(action.due_date, '23:59:00');
        if (newDue) {
          task.due_date = newDue;
          if (!nextStatus && task.status === 'OVERDUE' && newDue > now) {
            task.status = 'PENDING';
          }
        }
      }

      let exp = 0;
      let leveledUp = false;

      if (nextStatus === 'COMPLETED' && prevStatus !== 'COMPLETED') {
        const reward = await applyTaskCompletionReward(userId, task, actionDate);
        exp = reward.rewardExp;
        leveledUp = reward.leveledUp;
      } else if (nextStatus === 'PENDING' && prevStatus === 'COMPLETED') {
        await applyTaskUndoPenalty(userId, task);
      } else {
        if (nextStatus) task.status = nextStatus;
        await task.save();
      }

      executedResults.push({
        type: 'update_task',
        id: task._id,
        title: task.title,
        status: task.status,
        quest_rank: task.quest_rank,
        ...(exp > 0 ? { exp, leveledUp } : {})
      });
      continue;
    }

    // 7c. DELETE TASK / QUEST
    if (actionType === 'delete_task') {
      const task = await findTargetTask(userId, action);
      if (!task) {
        throw new Error(`Không tìm thấy Quest "${action.title || ''}" để xóa`);
      }
      await Task.deleteOne({ _id: task._id, user_id: userId });

      executedResults.push({
        type: 'delete_task',
        id: task._id,
        title: task.title
      });
      continue;
    }

    // 8. CREATE CALENDAR EVENT (Hỗ trợ cả sự kiện đơn lẫn lịch lặp định kỳ)
    if (actionType === 'create_calendar_event') {
      const rawTitle = action.title?.trim() || 'Sự kiện mới';
      const cleanTitle = capitalizeFirst(cleanTemporalWords(rawTitle)) || 'Sự kiện mới';
      const startTime = parseVnDateTime(action.start_time, '09:00:00') ?? now;
      let endTime = parseVnDateTime(action.end_time, '10:00:00');
      if (!endTime || endTime.getTime() <= startTime.getTime()) {
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      }

      const isRecurring = Boolean(action.is_recurring);
      const recurrenceType = isRecurring && ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(action.recurrence_type)
        ? action.recurrence_type
        : (isRecurring ? 'WEEKLY' : undefined);
      const recurrenceDays = isRecurring && Array.isArray(action.recurrence_days)
        ? action.recurrence_days.map((d: any) => Number(d)).filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)
        : undefined;
      const recurrenceEnd = isRecurring && action.recurrence_end
        ? (parseVnDateTime(action.recurrence_end, '23:59:59') ?? undefined)
        : undefined;

      const event = await CalendarEvent.create({
        user_id: userId,
        title: cleanTitle,
        description: action.description || '',
        start_time: startTime,
        end_time: endTime,
        color_code: action.color_code || '#00f0ff',
        is_recurring: isRecurring,
        ...(recurrenceType ? { recurrence_type: recurrenceType } : {}),
        ...(recurrenceDays && recurrenceDays.length > 0 ? { recurrence_days: recurrenceDays } : {}),
        ...(recurrenceEnd ? { recurrence_end: recurrenceEnd } : {})
      });

      executedResults.push({
        type: 'create_calendar_event',
        id: event._id,
        title: event.title,
        start_time: event.start_time,
        is_recurring: event.is_recurring
      });
      continue;
    }

    // 8b. UPDATE CALENDAR EVENT (Dời giờ/ngày, đổi tên, sửa 1 buổi ngoại lệ hoặc cả chuỗi lặp)
    if (actionType === 'update_calendar_event') {
      const resolved = await resolveCalendarTarget(userId, action);
      if (!resolved) {
        throw new Error(`Không tìm thấy sự kiện "${action.title || ''}" trong lịch trình để cập nhật`);
      }
      const { baseDoc, occurrenceStart } = resolved;
      const isSingleOccurrenceOverride =
        baseDoc.is_recurring &&
        action.scope !== 'series' &&
        occurrenceStart !== null;

      if (isSingleOccurrenceOverride && occurrenceStart) {
        const origDuration = new Date(baseDoc.end_time).getTime() - new Date(baseDoc.start_time).getTime();
        const occEndDefault = new Date(occurrenceStart.getTime() + origDuration);
        const newStart = action.start_time
          ? (parseVnDateTime(action.start_time, '09:00:00') ?? occurrenceStart)
          : occurrenceStart;
        let newEnd = action.end_time
          ? parseVnDateTime(action.end_time, '10:00:00')
          : (action.start_time ? new Date(newStart.getTime() + origDuration) : occEndDefault);
        if (!newEnd || newEnd.getTime() <= newStart.getTime()) {
          newEnd = new Date(newStart.getTime() + Math.max(origDuration, 60 * 60 * 1000));
        }

        const newTitle = action.title?.trim()
          ? (capitalizeFirst(cleanTemporalWords(action.title.trim())) || baseDoc.title)
          : baseDoc.title;

        const existingException = await CalendarEvent.findOne({
          user_id: userId,
          parent_event_id: baseDoc._id,
          exception_date: occurrenceStart
        });

        let savedEx: any;
        if (existingException) {
          existingException.title = newTitle;
          if (action.description !== undefined) existingException.description = action.description;
          existingException.start_time = newStart;
          existingException.end_time = newEnd;
          if (action.color_code) existingException.color_code = action.color_code;
          existingException.is_cancelled = false;
          savedEx = await existingException.save();
        } else {
          savedEx = await CalendarEvent.create({
            user_id: userId,
            title: newTitle,
            description: action.description !== undefined ? action.description : (baseDoc.description || ''),
            start_time: newStart,
            end_time: newEnd,
            color_code: action.color_code || baseDoc.color_code || '#00f0ff',
            is_recurring: false,
            parent_event_id: baseDoc._id,
            exception_date: occurrenceStart,
            is_cancelled: false
          });
        }

        executedResults.push({
          type: 'update_calendar_event',
          id: savedEx._id,
          title: savedEx.title,
          start_time: savedEx.start_time,
          scope: 'single'
        });
      } else {
        const origDuration = new Date(baseDoc.end_time).getTime() - new Date(baseDoc.start_time).getTime();
        if (action.title?.trim()) {
          baseDoc.title = capitalizeFirst(cleanTemporalWords(action.title.trim())) || baseDoc.title;
        }
        if (action.description !== undefined) baseDoc.description = action.description;
        if (action.color_code) baseDoc.color_code = action.color_code;

        if (action.start_time) {
          const parsedStart = parseVnDateTime(action.start_time, '09:00:00');
          if (parsedStart) {
            baseDoc.start_time = parsedStart;
            if (!action.end_time) {
              baseDoc.end_time = new Date(parsedStart.getTime() + Math.max(origDuration, 60 * 60 * 1000));
            }
          }
        }
        if (action.end_time) {
          const parsedEnd = parseVnDateTime(action.end_time, '10:00:00');
          if (parsedEnd) baseDoc.end_time = parsedEnd;
        }
        if (new Date(baseDoc.end_time).getTime() <= new Date(baseDoc.start_time).getTime()) {
          baseDoc.end_time = new Date(new Date(baseDoc.start_time).getTime() + 60 * 60 * 1000);
        }

        await baseDoc.save();
        executedResults.push({
          type: 'update_calendar_event',
          id: baseDoc._id,
          title: baseDoc.title,
          start_time: baseDoc.start_time,
          scope: baseDoc.is_recurring ? 'series' : 'single'
        });
      }
      continue;
    }

    // 8c. DELETE CALENDAR EVENT (Xóa sự kiện hoặc tạm nghỉ 1 buổi của lịch lặp)
    if (actionType === 'delete_calendar_event') {
      const resolved = await resolveCalendarTarget(userId, action);
      if (!resolved) {
        throw new Error(`Không tìm thấy sự kiện "${action.title || ''}" trong lịch trình để hủy`);
      }
      const { baseDoc, occurrenceStart } = resolved;

      if (baseDoc.is_recurring && action.scope !== 'series' && occurrenceStart) {
        // Nghỉ 1 buổi của lịch lặp -> tạo exception is_cancelled = true khớp chính xác timestamp ảo
        const origDuration = new Date(baseDoc.end_time).getTime() - new Date(baseDoc.start_time).getTime();
        const existingException = await CalendarEvent.findOne({
          user_id: userId,
          parent_event_id: baseDoc._id,
          exception_date: occurrenceStart
        });
        if (existingException) {
          existingException.is_cancelled = true;
          await existingException.save();
        } else {
          await CalendarEvent.create({
            user_id: userId,
            title: 'Cancelled Exception',
            start_time: occurrenceStart,
            end_time: new Date(occurrenceStart.getTime() + Math.max(origDuration, 60 * 60 * 1000)),
            is_recurring: false,
            parent_event_id: baseDoc._id,
            exception_date: occurrenceStart,
            is_cancelled: true
          });
        }

        executedResults.push({
          type: 'delete_calendar_event',
          id: baseDoc._id,
          title: baseDoc.title,
          scope: 'single'
        });
      } else if (baseDoc.is_recurring) {
        // Dừng cả chuỗi lặp (khớp behavior của DELETE /api/calendar/[id])
        const yesterday = new Date(now.getTime() - 86400000);
        baseDoc.recurrence_end = yesterday;
        await baseDoc.save();

        executedResults.push({
          type: 'delete_calendar_event',
          id: baseDoc._id,
          title: baseDoc.title,
          scope: 'series'
        });
      } else if (baseDoc.parent_event_id) {
        // Nếu đang là bản ghi exception của lịch lặp -> đánh dấu is_cancelled = true thay vì xóa vật lý (tránh occurrence gốc mọc lại)
        baseDoc.is_cancelled = true;
        await baseDoc.save();

        executedResults.push({
          type: 'delete_calendar_event',
          id: baseDoc._id,
          title: baseDoc.title,
          scope: 'single'
        });
      } else {
        await CalendarEvent.deleteOne({ _id: baseDoc._id, user_id: userId });

        executedResults.push({
          type: 'delete_calendar_event',
          id: baseDoc._id,
          title: baseDoc.title,
          scope: 'single'
        });
      }
      continue;
    }

    // 9. CREATE SHOPPING ITEM
    if (actionType === 'create_shopping_item') {
      const rawName = action.name?.trim() || 'Món đồ';
      const cleanName = capitalizeFirst(cleanTemporalWords(rawName)) || 'Món đồ';
      const quantity = Math.max(1, Number(action.quantity) || 1);
      const unit = action.unit?.trim() || 'món';
      const category = ['food', 'household', 'other'].includes(action.category) ? action.category : 'food';

      const item = await ShoppingItem.create({
        user_id: userId,
        name: cleanName,
        quantity,
        unit,
        category,
        checked: false
      });

      executedResults.push({
        type: 'create_shopping_item',
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      });
      continue;
    }

    // 9b. PURCHASE SHOPPING (Tick đã mua ShoppingItem -> Cất vào Kho đồ -> Trừ ví & ghi Transaction nếu có tiền)
    if (actionType === 'purchase_shopping') {
      const rawName = action.name?.trim() || 'Món đồ';
      const cleanName = capitalizeFirst(cleanTemporalWords(rawName)) || 'Món đồ';
      const quantity = Math.max(0.01, Number(action.quantity) || 1);
      const unit = action.unit?.trim() || 'món';
      const invCategory = ['food', 'spices', 'utilities'].includes(action.inventory_category)
        ? action.inventory_category
        : 'food';
      const addToInventory = action.add_to_inventory !== false;
      const amount = Math.max(0, Number(action.amount) || 0);
      const expiryDate = parseVnDateTime(action.expiryDate, '12:00:00') ?? undefined;

      let resolvedWallet: any = null;
      let txId: any = undefined;

      if (amount > 0) {
        resolvedWallet = await resolveUserWallet(userId, action.wallet_id, action.walletName, true);
        if (!resolvedWallet) {
          throw new Error(`Vui lòng chọn hoặc nêu rõ ví thanh toán cho "${cleanName}"`);
        }

        const deducted = await Wallet.findOneAndUpdate(
          { _id: resolvedWallet._id, user_id: userId, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { returnDocument: 'after' }
        );
        if (!deducted) {
          throw new Error(`Số dư ví "${resolvedWallet.name}" không đủ để thanh toán ${amount.toLocaleString('vi-VN')}đ`);
        }

        const tx = await Transaction.create({
          user_id: userId,
          type: 'expense',
          amount,
          date: actionDate,
          description: addToInventory ? `Mua dự trữ: ${cleanName}` : `Mua sắm: ${cleanName}`,
          category: invCategory === 'food' || invCategory === 'spices' ? 'food' : 'shopping',
          wallet_id: resolvedWallet._id,
          walletName: resolvedWallet.name
        });
        txId = tx._id;
      }

      // Tick ShoppingItem tương ứng (nếu có trong danh sách)
      let shoppingItem: any = null;
      if (typeof action.shopping_item_id === 'string' && mongoose.Types.ObjectId.isValid(action.shopping_item_id)) {
        shoppingItem = await ShoppingItem.findOneAndUpdate(
          { _id: action.shopping_item_id, user_id: userId },
          { $set: { checked: true } },
          { new: true }
        );
      }
      if (!shoppingItem) {
        const unchecked = await ShoppingItem.find({ user_id: userId, checked: false });
        const matched = matchByNormalizedName(unchecked, cleanName, (s) => s.name);
        if (matched) {
          matched.checked = true;
          shoppingItem = await matched.save();
        }
      }

      let invItem: any = null;
      if (addToInventory) {
        invItem = await Inventory.create({
          user_id: userId,
          name: cleanName,
          category: invCategory,
          quantity,
          originalQuantity: quantity,
          unit,
          purchaseDate: actionDate,
          expiryDate,
          isGift: false,
          totalValue: amount > 0 ? amount : undefined,
          originalValue: amount > 0 ? amount : undefined,
          wallet_id: amount > 0 ? resolvedWallet?._id : undefined,
          walletName: amount > 0 ? resolvedWallet?.name : undefined,
          transaction_id: txId
        });
      }

      executedResults.push({
        type: 'purchase_shopping',
        id: invItem?._id || shoppingItem?._id || txId,
        name: cleanName,
        amount,
        addedToInventory: addToInventory,
        checkedShopping: Boolean(shoppingItem),
        walletName: resolvedWallet?.name || action.walletName
      });
      continue;
    }

    // 10. CREATE INVENTORY ITEM
    if (actionType === 'create_inventory') {
      const rawName = action.name?.trim() || 'Vật phẩm';
      const cleanName = capitalizeFirst(cleanTemporalWords(rawName)) || 'Vật phẩm';
      const quantity = Math.max(0.01, Number(action.quantity) || 1);
      const unit = action.unit?.trim() || 'món';
      const category = action.category?.trim() || 'food';
      const expiryDate = parseVnDateTime(action.expiryDate, '12:00:00') ?? undefined;

      const item = await Inventory.create({
        user_id: userId,
        name: cleanName,
        category,
        quantity,
        originalQuantity: quantity,
        unit,
        purchaseDate: actionDate,
        expiryDate,
        isGift: false
      });

      executedResults.push({
        type: 'create_inventory',
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      });
      continue;
    }

    // 10b. UPDATE INVENTORY ITEM (Tiêu hao, bỏ đồ hỏng, thêm/điều chỉnh số lượng hoặc HSD trong Kho)
    if (actionType === 'update_inventory') {
      let item: any = null;
      if (typeof action.inv_id === 'string' && mongoose.Types.ObjectId.isValid(action.inv_id)) {
        item = await Inventory.findOne({ _id: action.inv_id, user_id: userId });
      }
      if (!item && action.name) {
        const activeInv = await Inventory.find({ user_id: userId, quantity: { $gt: 0 } });
        item = matchByNormalizedName(activeInv, action.name, (i) => i.name);
        if (!item) {
          const allInv = await Inventory.find({ user_id: userId });
          item = matchByNormalizedName(allInv, action.name, (i) => i.name);
        }
      }
      if (!item) {
        throw new Error(`Không tìm thấy "${action.name || 'món đồ'}" trong kho để cập nhật`);
      }

      const op = ['set', 'deduct', 'add', 'discard'].includes(action.operation) ? action.operation : 'set';
      const oldQty = item.quantity;
      let newQty = oldQty;

      if (op === 'discard') {
        newQty = 0;
      } else if (op === 'deduct') {
        const delta = Math.max(0, Number(action.delta_quantity ?? action.quantity ?? 0));
        if (delta > 0) {
          newQty = Math.max(0, Number((oldQty - delta).toFixed(4)));
        }
      } else if (op === 'add') {
        const delta = Math.max(0, Number(action.delta_quantity ?? action.quantity ?? 0));
        newQty = Number((oldQty + delta).toFixed(4));
      } else if (action.quantity !== undefined) {
        newQty = Math.max(0, Number(action.quantity) || 0);
      }

      if (newQty === 0) {
        item.totalValue = 0;
      } else if (newQty !== oldQty) {
        if (oldQty > 0 && item.totalValue && item.totalValue > 0) {
          const unitPrice = item.totalValue / oldQty;
          item.totalValue = Math.max(0, Math.round(unitPrice * newQty));
        } else if (oldQty === 0 && newQty > 0) {
          let baseValue = item.originalValue || 0;
          if (!baseValue && item.transaction_id) {
            const tx = await Transaction.findById(item.transaction_id);
            if (tx) baseValue = tx.amount;
          }
          if (baseValue > 0 && item.originalQuantity > 0) {
            const unitPrice = baseValue / item.originalQuantity;
            item.totalValue = Math.round(unitPrice * newQty);
          }
        }
      }

      item.quantity = newQty;
      if (newQty > item.originalQuantity) {
        item.originalQuantity = newQty;
      }
      if (action.expiryDate) {
        const parsedExp = parseVnDateTime(action.expiryDate, '12:00:00');
        if (parsedExp) item.expiryDate = parsedExp;
      }
      await item.save();

      executedResults.push({
        type: 'update_inventory',
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        operation: op
      });
      continue;
    }

    // 11. RECORD WEIGHT / HEALTH
    if (actionType === 'record_weight') {
      const weight = Number(action.weight);
      if (weight && weight > 0) {
        const user = await User.findById(userId);
        if (user) {
          if (action.height && Number(action.height) > 0) {
            user.height = Number(action.height);
          }

          const recordDate = actionDate;
          const vnDateKey = getVnDateStr(recordDate);
          const startOfDay = new Date(`${vnDateKey}T00:00:00+07:00`);
          const endOfDay = new Date(`${vnDateKey}T23:59:59.999+07:00`);

          await WeightLog.findOneAndDelete({
            user_id: userId,
            date: { $gte: startOfDay, $lte: endOfDay }
          });

          const weightLog = await WeightLog.create({
            user_id: userId,
            weight,
            date: recordDate
          });

          const heightInM = (user.height || 170) / 100;
          const bmi = weight / (heightInM * heightInM);
          const isNormalBmi = bmi >= 18.5 && bmi <= 24.9;

          const rewardExp = 100;
          user.current_exp += rewardExp;

          let requiredExp = getExpForNextLevel(user.level);
          let leveledUp = false;
          while (user.current_exp >= requiredExp) {
            user.current_exp -= requiredExp;
            user.level += 1;
            user.max_hp += 50;
            user.max_mp += 20;
            leveledUp = true;
            requiredExp = getExpForNextLevel(user.level);
          }

          if (isNormalBmi) {
            user.max_hp += 100;
            user.current_hp = user.max_hp;
          }

          await user.save();

          executedResults.push({
            type: 'record_weight',
            id: weightLog._id,
            weight,
            bmi: parseFloat(bmi.toFixed(1)),
            isNormalBmi,
            rewardExp,
            leveledUp
          });
        }
      }
      continue;
    }

    // 12. CREATE RECIPE
    if (actionType === 'create_recipe') {
      const rawName = action.name?.trim() || 'Công thức mới';
      const cleanName = capitalizeFirst(cleanTemporalWords(rawName)) || 'Công thức mới';
      const ingredients: string[] = Array.isArray(action.ingredients)
        ? action.ingredients.map((i: any) => String(i).trim()).filter(Boolean)
        : (typeof action.ingredients === 'string'
          ? action.ingredients.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []);
      const instructions = action.instructions ? String(action.instructions).trim() : undefined;

      const recipe = await Recipe.create({
        user_id: userId,
        name: cleanName,
        ingredients,
        ...(instructions ? { instructions } : {})
      });

      executedResults.push({
        type: 'create_recipe',
        id: recipe._id,
        name: recipe.name,
        ingredientsCount: ingredients.length,
        ingredients
      });
      continue;
    }
  }

  return executedResults;
}
