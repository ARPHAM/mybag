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
import { convertQtyToInventoryUnit, getCanonicalUnit } from '@/lib/unitHelper';
import {
  formatVnClockString,
  formatVnDisplayTime,
  formatVnIsoString,
  getVnDateStr,
  parseVnDateTime,
  normalizeToVnIso
} from '@/lib/vnTime';

// =========================================================================
// 1. TYPES & CONTRACTS
// =========================================================================

export type YuiDataScope =
  | 'all'
  | 'calendar'
  | 'tasks'
  | 'finances'
  | 'inventory_recipes'
  | 'meals_nutrition'
  | 'weight_health'
  | 'shopping'
  | 'general_chat';

export interface YuiQueryParams {
  calendar?: {
    date_start?: string;
    date_end?: string;
    target_date_label?: string;
  };
  meals?: {
    date_start?: string;
    date_end?: string;
    target_date_label?: string;
  };
  finances?: {
    wallet_keyword?: string;
    category?: string;
    debt_person?: string;
  };
  inventory_recipes?: {
    recipe_name?: string;
    need_recipe_instructions?: boolean;
    explicit_recipe_request?: boolean;
    is_shopping_advice?: boolean;
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
  lang: 'vi' | 'en';
}

export interface YuiProactiveAlert {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  category: 'budget' | 'inventory' | 'task' | 'debt' | 'calendar';
  title: string;
  detail: string;
  suggestedPrompt: string;
}

export interface YuiPlanResult {
  summary: string;
  reply: string;
  actions: any[];
}

type YuiActionRecord = Record<string, unknown> & { actionType?: string };

// =========================================================================
// 2. LANGUAGE & TEXT UTILITIES
// =========================================================================

/**
 * Phát hiện ngôn ngữ của câu hỏi (Ưu tiên: tiếng Việt nếu có dấu/từ khoá VN, tiếng Anh nếu thuần EN).
 */
export function detectQueryLanguage(text: string, clientLang: 'vi' | 'en' = 'vi'): 'vi' | 'en' {
  if (!text || typeof text !== 'string') return clientLang;

  // 1. Có dấu thanh / ký tự đặc thù tiếng Việt
  const hasVnDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
  if (hasVnDiacritics) return 'vi';

  // 2. Từ khóa tiếng Việt phổ biến không dấu
  const vnCommonWords = /\b(hom nay|ngay mai|hom qua|tuan nay|tuan sau|thang nay|tien|dong|nghin|trieu|an|uong|mua|ban|no|vay|kho|tu lanh|nhiem vu|lich|hen|hop|can nang|chieu cao|giup toi|cho toi|nhe|nha|khong|chua)\b/i;
  if (vnCommonWords.test(text)) return 'vi';

  // 3. Từ khóa tiếng Anh phổ biến
  const enCommonWords = /\b(the|is|are|was|were|spent|spend|cost|bought|buy|today|tomorrow|yesterday|tonight|breakfast|lunch|dinner|meal|meeting|task|deadline|schedule|weigh|weight|dollar|cash|pantry|fridge|recipe|please|help|add|cancel|remind|borrow|lend|debt|give|status|summary|what|how)\b/i;
  if (enCommonWords.test(text)) return 'en';

  return clientLang;
}

/**
 * Loại bỏ từ ngữ chỉ thời gian tương đối (cả tiếng Việt lẫn tiếng Anh)
 * khỏi tên món ăn, tiêu đề nhiệm vụ, lịch trình, ghi chú.
 */
export function cleanTemporalWords(text: string): string {
  if (!text) return '';
  return text
    // Tiếng Việt
    .replace(/\b(sáng|trưa|chiều|tối|đêm)\s+(nay|qua|kia|hôm nay|hôm qua)\b/gi, '')
    .replace(/\b(hôm nay|hôm qua|hôm kia|ngày mai|ngày mốt|chiều mai|sáng mai|tối mai|mai)\b/gi, '')
    .replace(/\b(vừa ăn|vừa uống|mới ăn|mới uống|vừa mới|vừa mua|mới mua|vừa xong|mới xong|hồi nãy|lúc nãy)\b/gi, '')
    .replace(/\b(buổi\s+(sáng|trưa|chiều|tối|đêm))\b/gi, '')
    .replace(/\b(bữa\s+(sáng|trưa|tối|đêm))\b/gi, '')
    // Tiếng Anh
    .replace(/\b(this\s+(morning|afternoon|evening|night|week|month|year))\b/gi, '')
    .replace(/\b(today|yesterday|tomorrow|tonight)\b/gi, '')
    .replace(/\b(just\s+)?(bought|ate|had|cooked|drank|finished|now)\b/gi, '')
    .replace(/\b(earlier|later|last\s+(night|week|month))\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function normalizeVietnamese(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

/**
 * Trích xuất JSON an toàn tuyệt đối từ phản hồi của LLM.
 */
export function extractJsonFromAiResponse(raw: string, lang: 'vi' | 'en' = 'vi'): any {
  const fallbackSummary = lang === 'en' ? 'Yui reply' : 'Yui trả lời';
  const fallbackGreeting = lang === 'en'
    ? 'Yui is here, Papa! How can I help you today?'
    : 'Dạ Yui đây ạ! Papa cần Yui hỗ trợ gì thế ạ?';

  if (!raw || typeof raw !== 'string') {
    return {
      summary: fallbackSummary,
      reply: fallbackGreeting,
      actions: []
    };
  }

  const cleaned = raw.trim();

  const tryParse = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      try {
        const sanitized = str.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitized);
      } catch {
        return null;
      }
    }
  };

  // 1. Parse trực tiếp
  const direct = tryParse(cleaned);
  if (direct) return direct;

  // 2. Khối ```json ... ``` hoặc ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    const fromBlock = tryParse(codeBlockMatch[1].trim());
    if (fromBlock) return fromBlock;
  }

  // 3. Cặp ngoặc nhọn { ... } ngoài cùng
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const fromBrace = tryParse(cleaned.substring(firstBrace, lastBrace + 1));
    if (fromBrace) return fromBrace;
  }

  // 4. Cặp ngoặc vuông [ ... ] ngoài cùng
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const fromBracket = tryParse(cleaned.substring(firstBracket, lastBracket + 1));
    if (fromBracket) return fromBracket;
  }

  // 5. Fallback văn bản hội thoại
  const cleanReply = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return {
    summary: fallbackSummary,
    reply: cleanReply || fallbackGreeting,
    actions: []
  };
}

// =========================================================================
// 3. DATE & TIME UTILITIES
// =========================================================================

export function computeVnPeriodBounds(now: Date = new Date()) {
  const vnFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayVnStr = vnFormatter.format(now);
  const currentMonthStr = todayVnStr.slice(0, 7);

  const prevMonthDate = new Date(now.getTime() - 28 * 86400000);
  const prevMonthStr = vnFormatter.format(prevMonthDate).slice(0, 7);

  const monthStart = new Date(`${currentMonthStr}-01T00:00:00+07:00`);
  const prevMonthStart = new Date(`${prevMonthStr}-01T00:00:00+07:00`);

  const todayStart = new Date(`${todayVnStr}T00:00:00+07:00`);
  const todayEnd = new Date(`${todayVnStr}T23:59:59.999+07:00`);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  const vnDay = getVnDayOfWeek(todayStart);
  const daysSinceMonday = vnDay === 0 ? 6 : vnDay - 1;
  const thisMondayStart = new Date(todayStart.getTime() - daysSinceMonday * 86400000);
  const thisSundayEnd = new Date(thisMondayStart.getTime() + 7 * 86400000 - 1);
  const prevWeekStart = new Date(thisMondayStart.getTime() - 7 * 86400000);
  const nextMondayStart = new Date(thisMondayStart.getTime() + 7 * 86400000);
  const nextSundayEnd = new Date(nextMondayStart.getTime() + 7 * 86400000 - 1);

  const sevenDaysAgoStart = new Date(todayStart.getTime() - 6 * 86400000);
  const threeDaysLater = new Date(now.getTime() + 3 * 86400000);
  const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000);

  return {
    todayVnStr,
    currentMonthStr,
    prevMonthStr,
    monthStart,
    prevMonthStart,
    todayStart,
    todayEnd,
    yesterdayStart,
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

/**
 * Phân giải thời gian tự nhiên đa ngôn ngữ (Tiếng Việt & Tiếng Anh).
 */
export function resolveVnDateExpression(text: string, now: Date = new Date()): {
  label: string;
  start: Date;
  end: Date;
} | null {
  const nt = normalizeVietnamese(text);
  const bounds = computeVnPeriodBounds(now);
  const isNextWeek = /\b(tuan toi|tuan sau|next week)\b/.test(nt);

  // Hôm nay / Today
  if (/\b(hom nay|today|tonight)\b/.test(nt)) {
    return { label: 'Hôm nay', start: bounds.todayStart, end: bounds.todayEnd };
  }

  // Ngày mai / Tomorrow
  if (/\b(ngay mai|mai|tomorrow)\b/.test(nt)) {
    const s = new Date(bounds.todayStart.getTime() + 86400000);
    const e = new Date(s.getTime() + 86400000 - 1);
    return { label: 'Ngày mai', start: s, end: e };
  }

  // Ngày kia / Day after tomorrow
  if (/\b(ngay kia|mot|day after tomorrow)\b/.test(nt)) {
    const s = new Date(bounds.todayStart.getTime() + 2 * 86400000);
    const e = new Date(s.getTime() + 86400000 - 1);
    return { label: 'Ngày kia', start: s, end: e };
  }

  // Hôm qua / Yesterday
  if (/\b(hom qua|yesterday)\b/.test(nt)) {
    const s = bounds.yesterdayStart;
    const e = new Date(s.getTime() + 86400000 - 1);
    return { label: 'Hôm qua', start: s, end: e };
  }

  // Cuối tuần / Weekend
  if (/\b(cuoi tuan|weekend)\b/.test(nt)) {
    const baseMon = isNextWeek ? bounds.nextMondayStart : bounds.thisMondayStart;
    const satStart = new Date(baseMon.getTime() + 5 * 86400000);
    const sunEnd = new Date(baseMon.getTime() + 7 * 86400000 - 1);
    return { label: isNextWeek ? 'Cuối tuần sau' : 'Cuối tuần này', start: satStart, end: sunEnd };
  }

  // Các ngày trong tuần
  const daysMap: { regex: RegExp; dayIdx: number; name: string }[] = [
    { regex: /\b(chu nhat|cn|sunday)\b/, dayIdx: 0, name: 'Chủ Nhật' },
    { regex: /\b(thu 7|thu bay|t7|saturday)\b/, dayIdx: 6, name: 'Thứ Bảy' },
    { regex: /\b(thu 6|thu sau|t6|friday)\b/, dayIdx: 5, name: 'Thứ Sáu' },
    { regex: /\b(thu 5|thu nam|t5|thursday)\b/, dayIdx: 4, name: 'Thứ Năm' },
    { regex: /\b(thu 4|thu tu|t4|wednesday)\b/, dayIdx: 3, name: 'Thứ Tư' },
    { regex: /\b(thu 3|thu ba|t3|tuesday)\b/, dayIdx: 2, name: 'Thứ Ba' },
    { regex: /\b(thu 2|thu hai|t2|monday)\b/, dayIdx: 1, name: 'Thứ Hai' }
  ];

  for (const d of daysMap) {
    if (d.regex.test(nt)) {
      const offset = d.dayIdx === 0 ? 6 : d.dayIdx - 1;
      const baseMon = isNextWeek ? bounds.nextMondayStart : bounds.thisMondayStart;
      const s = new Date(baseMon.getTime() + offset * 86400000);
      const e = new Date(s.getTime() + 86400000 - 1);
      return {
        label: `${d.name}${isNextWeek ? ' tuần tới' : ' tuần này'} (${formatVnDateOnly(s)})`,
        start: s,
        end: e
      };
    }
  }

  // Tuần tới / Next week
  if (/\b(tuan toi|tuan sau|next week)\b/.test(nt)) {
    return { label: 'Tuần tới', start: bounds.nextMondayStart, end: bounds.nextSundayEnd };
  }

  // Tuần này / This week
  if (/\b(tuan nay|this week)\b/.test(nt)) {
    return { label: 'Tuần này', start: bounds.thisMondayStart, end: bounds.thisSundayEnd };
  }

  // Tháng này / This month
  if (/\b(thang nay|this month)\b/.test(nt)) {
    const endOfMonth = new Date(bounds.monthStart.getFullYear(), bounds.monthStart.getMonth() + 1, 0, 23, 59, 59);
    return { label: 'Tháng này', start: bounds.monthStart, end: endOfMonth };
  }

  // Tháng trước / Last month
  if (/\b(thang truoc|last month)\b/.test(nt)) {
    const endOfPrev = new Date(bounds.prevMonthStart.getFullYear(), bounds.prevMonthStart.getMonth() + 1, 0, 23, 59, 59);
    return { label: 'Tháng trước', start: bounds.prevMonthStart, end: endOfPrev };
  }

  return null;
}

// =========================================================================
// 4. PROACTIVE BRIEFING (0 TOKENS)
// =========================================================================

export async function getYuiProactiveBriefing(userId: string, lang: 'vi' | 'en' = 'vi') {
  await dbConnect();
  const isEn = lang === 'en';
  const now = new Date();
  const bounds = computeVnPeriodBounds(now);
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
    Budget.find({ user_id: userId, month: bounds.currentMonthStr }).lean(),
    Transaction.find({ user_id: userId, type: 'expense', date: { $gte: bounds.monthStart } }).select('amount category').lean(),
    Inventory.find({
      user_id: userId,
      quantity: { $gt: 0 },
      expiryDate: { $ne: null, $lte: bounds.threeDaysLater }
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
      dueDate: { $ne: null, $lte: bounds.threeDaysLater }
    }).sort({ dueDate: 1 }).limit(5).lean(),
    getExpandedCalendarEvents(userId, now, bounds.todayEnd)
  ]);

  const alerts: YuiProactiveAlert[] = [];

  // 1. Cảnh báo ngân sách
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
        title: isEn
          ? (ratio >= 1 ? `Exceeded budget: ${b.name} (${pct}%)` : `Near budget limit: ${b.name} (${pct}%)`)
          : (ratio >= 1 ? `Vượt ngân sách ${b.name} (${pct}%)` : `Sắp chạm ngân sách ${b.name} (${pct}%)`),
        detail: isEn
          ? `Spent ${spent.toLocaleString('en-US')} VND / ${b.limit.toLocaleString('en-US')} VND`
          : `Đã chi ${spent.toLocaleString('vi-VN')}đ / ${b.limit.toLocaleString('vi-VN')}đ trong tháng này`,
        suggestedPrompt: isEn
          ? `View ${b.name} spending details for this month`
          : `Xem chi tiết chi tiêu ${b.name} tháng này và so sánh với tháng trước`
      });
    }
  });

  // 2. Đồ sắp hết hạn
  if ((expiringInventory as any[]).length > 0) {
    const items = expiringInventory as any[];
    const hasExpired = items.some((i) => new Date(i.expiryDate) < now);
    const preview = items.slice(0, 3).map((i) => `${i.name} (${getVnDateStr(i.expiryDate)})`).join(', ');
    alerts.push({
      id: 'inventory-expiring',
      severity: hasExpired ? 'danger' : 'warning',
      category: 'inventory',
      title: isEn
        ? `${items.length} pantry item${items.length > 1 ? 's' : ''} ${hasExpired ? 'expired or expiring soon' : 'expiring soon'}`
        : `${items.length} món tủ lạnh ${hasExpired ? 'đã/sắp hết hạn' : 'sắp hết hạn'}`,
      detail: preview + (items.length > 3 ? (isEn ? ` and ${items.length - 3} more` : ` và ${items.length - 3} món khác`) : ''),
      suggestedPrompt: isEn
        ? 'What is expiring soon in the pantry? Suggest recipes to cook right away'
        : 'Kho đồ có gì sắp hết hạn? Gợi ý món nấu ngay từ các nguyên liệu đó'
    });
  }

  // 3. Quests SAO quá hạn hoặc sắp tới hạn
  if ((overdueTasks as any[]).length > 0 || (dueSoonTasks as any[]).length > 0) {
    const ovCount = (overdueTasks as any[]).length;
    const soonCount = (dueSoonTasks as any[]).length;
    const parts: string[] = [];
    if (ovCount > 0) parts.push(isEn ? `${ovCount} overdue quest${ovCount > 1 ? 's' : ''}` : `${ovCount} quest quá hạn`);
    if (soonCount > 0) parts.push(isEn ? `${soonCount} quest${soonCount > 1 ? 's' : ''} due in 24h` : `${soonCount} quest hạn trong 24h`);
    const sampleTitle = (overdueTasks[0] as any)?.title || (dueSoonTasks[0] as any)?.title || '';
    alerts.push({
      id: 'tasks-urgent',
      severity: ovCount > 0 ? 'danger' : 'warning',
      category: 'task',
      title: parts.join(' · '),
      detail: sampleTitle
        ? (isEn ? `Priority: "${sampleTitle}"` : `Ưu tiên: "${sampleTitle}"`)
        : (isEn ? 'Resolve soon to prevent MP loss' : 'Cần xử lý sớm để không mất MP'),
      suggestedPrompt: ovCount > 0
        ? (isEn ? 'View overdue quests and what to prioritize?' : 'Xem các quest quá hạn và nên làm gì trước?')
        : (isEn ? 'Any quests to complete today?' : 'Hôm nay có quest nào cần làm?')
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
      title: isEn
        ? `${(dueDebts as any[]).length} unsettled debt${(dueDebts as any[]).length > 1 ? 's' : ''} near due date`
        : `${(dueDebts as any[]).length} khoản nợ ${hasPastDue ? 'đã/sắp tới hạn' : 'sắp tới hạn'}`,
      detail: isEn
        ? `${firstDebt.type === 'lent' ? 'Collect from' : 'Pay to'} ${firstDebt.personName}: ${(firstDebt.remainingAmount || 0).toLocaleString('en-US')} VND`
        : `${firstDebt.type === 'lent' ? 'Thu của' : 'Trả cho'} ${firstDebt.personName}: ${(firstDebt.remainingAmount || 0).toLocaleString('vi-VN')}đ`,
      suggestedPrompt: isEn ? 'Check unsettled debts' : 'Kiểm tra các khoản nợ chưa trả hiện tại'
    });
  }

  // 5. Lịch hẹn hôm nay
  const nowMs = now.getTime();
  const futureToday = (upcomingTodayEvents as any[]).filter((e) => new Date(e.start_time).getTime() > nowMs);
  if (futureToday.length > 0) {
    const nextEv = futureToday[0];
    alerts.push({
      id: `cal-${nextEv._id.toString()}`,
      severity: 'info',
      category: 'calendar',
      title: isEn
        ? `${futureToday.length} upcoming event${futureToday.length > 1 ? 's' : ''} today`
        : `Hôm nay còn ${futureToday.length} lịch hẹn sắp tới`,
      detail: `${nextEv.title} (${formatVnDisplayTime(nextEv.start_time)} - ${formatVnDisplayTime(nextEv.end_time)})`,
      suggestedPrompt: isEn ? 'What is on my schedule today, Papa?' : 'Lịch trình hôm nay của Papa có gì?'
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

// =========================================================================
// 5. DYNAMIC CONTEXT BUILDER
// =========================================================================

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
  const needMeals = isAll || scopes.includes('meals_nutrition') || scopes.includes('inventory_recipes');
  const needWeight = isAll || scopes.includes('weight_health');
  const needShopping = isAll || scopes.includes('shopping') || scopes.includes('inventory_recipes');

  const now = new Date();
  const bounds = computeVnPeriodBounds(now);

  if (needTasks) {
    await Task.updateMany(
      { user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS'] }, due_date: { $lt: now } },
      { $set: { status: 'OVERDUE' } }
    );
  }

  const hasSpecificCalendar = needCalendar && !!params?.calendar?.date_start && !!params?.calendar?.date_end;
  const calStart = hasSpecificCalendar ? new Date(params.calendar!.date_start!) : bounds.yesterdayStart;
  const calEnd = hasSpecificCalendar ? new Date(params.calendar!.date_end!) : bounds.thirtyDaysLater;

  const hasSpecificMeals = needMeals && !!params?.meals?.date_start && !!params?.meals?.date_end;
  const mealStart = hasSpecificMeals ? new Date(params.meals!.date_start!) : bounds.todayStart;
  const mealEnd = hasSpecificMeals ? new Date(params.meals!.date_end!) : bounds.todayEnd;
  const mealQueryStart = new Date(Math.min(mealStart.getTime(), bounds.sevenDaysAgoStart.getTime()));
  const mealQueryEnd = new Date(Math.max(mealEnd.getTime(), bounds.todayEnd.getTime()));

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
    recipes
  ] = await Promise.all([
    User.findById(userId).lean(),
    needWallets ? Wallet.find({ user_id: userId }).lean() : Promise.resolve([]),
    needFinances ? Transaction.find({ user_id: userId, date: { $gte: bounds.prevMonthStart } }).select('amount type category date walletName').lean() : Promise.resolve([]),
    needFinances ? Transaction.find({ user_id: userId }).sort({ date: -1, createdAt: -1 }).limit(10).lean() : Promise.resolve([]),
    needFinances ? Debt.find({ user_id: userId, status: { $ne: 'paid' } }).lean() : Promise.resolve([]),
    needFinances ? Budget.find({ user_id: userId, month: bounds.currentMonthStr }).lean() : Promise.resolve([]),
    needInventory ? Inventory.find({ user_id: userId }).sort({ quantity: -1, expiryDate: 1 }).limit(35).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS'] } }).sort({ due_date: 1 }).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: 'OVERDUE' }).sort({ due_date: 1 }).limit(10).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: 'COMPLETED' }).sort({ completed_at: -1, updatedAt: -1 }).limit(5).lean() : Promise.resolve([]),
    needCalendar ? getExpandedCalendarEvents(userId, calStart, calEnd) : Promise.resolve([]),
    (needMeals || needWeight) ? MealLog.find({ user_id: userId, consumed_at: { $gte: mealQueryStart, $lte: mealQueryEnd } }).sort({ consumed_at: -1 }).lean() : Promise.resolve([]),
    (needWeight || needMeals) ? WeightLog.findOne({ user_id: userId }).sort({ date: -1 }).lean() : Promise.resolve(null),
    (needWeight || needMeals) ? HealthAnalysis.findOne({ user_id: userId }).sort({ analyzed_at: -1 }).lean() : Promise.resolve(null),
    needShopping ? ShoppingItem.find({ user_id: userId, checked: false }).limit(25).lean() : Promise.resolve([]),
    needInventory ? Recipe.find({ user_id: userId }).select('name ingredients').limit(20).lean() : Promise.resolve([])
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

  if (needWallets || needFinances) {
    context.danh_sach_vi = (wallets as any[]).map(w => ({
      id: w._id.toString(),
      name: w.name,
      balance: w.balance
    }));
  }

  if (needFinances) {
    let monthIncome = 0;
    let monthExpense = 0;
    const expenseByCategory: Record<string, number> = {};

    (twoMonthTx as any[]).forEach(t => {
      const txTime = new Date(t.date).getTime();
      const amt = t.amount || 0;
      const cat = t.category || 'other';
      if (txTime >= bounds.monthStart.getTime()) {
        if (t.type === 'income') monthIncome += amt;
        else if (t.type === 'expense') {
          monthExpense += amt;
          expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
        }
      }
    });

    context.tai_chinh = {
      thang_nam: bounds.currentMonthStr,
      tong_so_du: (wallets as any[]).reduce((s, w) => s + (w.balance || 0), 0),
      danh_sach_vi: context.danh_sach_vi,
      thang_hien_tai: {
        tong_thu: monthIncome,
        tong_chi: monthExpense,
        chi_theo_danh_muc: expenseByCategory
      },
      ngan_sach_thang: (budgets as any[]).map(b => ({
        id: b._id.toString(),
        ten: b.name,
        danh_muc: b.category,
        han_muc: b.limit,
        da_chi: expenseByCategory[b.category] || 0
      })),
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
        loai: d.type,
        trang_thai: d.status,
        tong_no: d.totalAmount,
        con_lai: d.remainingAmount,
        han_tra: d.dueDate ? getVnDateStr(d.dueDate) : null
      }))
    };
  }

  if (needInventory) {
    const active = (inventoryItems as any[]).filter(item => (Number(item.quantity) || 0) > 0);
    context.kho_do_va_cong_thuc = {
      kho_do_hien_co: active.map(i => ({
        id: i._id.toString(),
        ten: i.name,
        so_luong: i.quantity,
        don_vi: i.unit,
        danh_muc: i.category,
        trang_thai: i.stock_status || 'stable',
        han_su_dung: i.expiryDate ? getVnDateStr(i.expiryDate) : null
      })),
      cong_thuc_nau_an: (recipes as any[]).map(r => ({
        id: r._id.toString(),
        ten: r.name,
        nguyen_lieu: r.ingredients || []
      }))
    };
  }

  if (needTasks) {
    context.nhiem_vu_quests = {
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
      }))
    };
  }

  if (needCalendar) {
    context.lich_trinh = {
      danh_sach_su_kien: (expandedCalendarEvents as any[]).map(e => ({
        id: e._id.toString(),
        parent_event_id: e.parent_event_id ? e.parent_event_id.toString() : null,
        tieu_de: e.title,
        thu_va_ngay: formatVnDateOnly(e.start_time),
        thoi_gian: `${formatVnDisplayTime(e.start_time)} - ${formatVnDisplayTime(e.end_time)}`,
        start_iso: formatVnIsoString(e.start_time),
        end_iso: formatVnIsoString(e.end_time),
        ghi_chu: e.description || '',
        la_lich_lap: Boolean(e.is_recurring || e.parent_event_id)
      }))
    };
  }

  if (needMeals || needWeight) {
    context.suc_khoe_va_bua_an = {
      cac_bua_an_gan_nhat: (allWindowMeals as any[]).slice(0, 15).map(m => ({
        id: m._id.toString(),
        mon: m.food_name,
        loai_bua: m.meal_tier,
        nguon: m.source || 'eat_out',
        calo: m.calo || 0,
        gia_tien: m.cost || 0,
        thoi_gian: formatVnDisplayTime(m.consumed_at)
      })),
      can_nang_gan_nhat_kg: latestWeightKg,
      bmi
    };
  }

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

// =========================================================================
// 6. MULTILINGUAL FAST SCOPE & PARAM EXTRACTION
// =========================================================================

export function detectFastScopesAndParams(text: string, now: Date = new Date()): FastDetectionResult | null {
  const lang = detectQueryLanguage(text);
  const nt = normalizeVietnamese(text);
  const scopes = new Set<YuiDataScope>();
  const params: YuiQueryParams = {};

  const dateRes = resolveVnDateExpression(text, now);

  // 1. Calendar
  const isCalendar = /\b(lich|hen|hop|su kien|thoi gian bieu|ranh|ban|meeting|schedule|calendar|event|busy|free|reschedule|postpone|cancel|appointment|dinh ky|lap lai|recurring)\b/i.test(nt);
  if (isCalendar) {
    scopes.add('calendar');
    if (dateRes) {
      params.calendar = {
        date_start: dateRes.start.toISOString(),
        date_end: dateRes.end.toISOString(),
        target_date_label: dateRes.label
      };
    }
  }

  // 2. Tasks
  const isTask = /\b(nhiem vu|quest|task|todo|deadline|han chot|qua han|overdue|hoan thanh|complete|done|finish|rank\s+[sabcd])\b/i.test(nt);
  if (isTask) {
    scopes.add('tasks');
  }

  // 3. Finances & Debts
  const hasCurrency = /\b\d+(?:[.,]\d+)?\s*(k|tr|trieu|nghin|vnd|dong|d|bucks|\$|usd)\b/i.test(nt);
  const isFinance = hasCurrency || /\b(tien|vi|chi|tieu|thu|nap|rut|luong|giao dich|vay|no|muon|tra ho|doi no|tra no|ngan sach|han muc|so du|spend|spent|cost|paid|income|salary|transfer|debt|lend|borrow|budget|wallet|cash|balance|momo|mb|vcb|tcb)\b/i.test(nt);
  if (isFinance) {
    scopes.add('finances');
  }

  // 4. Meals & Nutrition
  const isMeal = /\b(an|uong|bua sang|bua trua|bua toi|bua dem|bua phu|tu nau|com|pho|bun|ca phe|tra sua|calo|kcal|protein|carb|fat|macro|dinh duong|eat|ate|eaten|eating|had|having|drink|drank|drunk|drinking|breakfast|lunch|dinner|meal|meals|snack|food|dish|nutrition|calories)\b/i.test(nt);
  if (isMeal) {
    scopes.add('meals_nutrition');
    if (hasCurrency) scopes.add('finances');
    if (/\b(tu nau|kho|tu lanh|pantry|fridge|cook)\b/i.test(nt)) scopes.add('inventory_recipes');
  }

  // 5. Inventory & Recipes
  const isInventory = /\b(tu lanh|kho|nguyen lieu|thuc pham|gia vi|ton kho|het han|pantry|fridge|inventory|stock|cook|cooking|recipe|expired|ingredient|spices|nau|cong thuc)\b/i.test(nt);
  if (isInventory) {
    scopes.add('inventory_recipes');
  }

  // 6. Weight & Health
  const isWeight = /\b(can nang|chieu cao|suc khoe|bmi|weight|weighed|weighing|weigh|height|health|kilo)\b|(?:\d+(?:[.,]\d+)?\s*(?:kg|cm)\b)|\bcan\b/i.test(nt);
  if (isWeight) {
    scopes.add('weight_health');
  }

  // 7. Shopping
  const isShopping = /\b(mua sam|di cho|sieu thi|danh sach mua|can mua|da mua|shopping|groceries|buy|purchased|market)\b/i.test(nt);
  if (isShopping) {
    scopes.add('shopping');
    if (/\b(da mua|cat vao kho|purchased|bought)\b/i.test(nt)) {
      scopes.add('inventory_recipes');
      scopes.add('finances');
    }
  }

  // 8. General Briefing / Overview
  const isBriefing = /\b(tinh hinh|tong ket|bao cao|nhac nho|canh bao|briefing|hom nay the nao|hom nay co gi|what do i have today|summary|status)\b/i.test(nt);
  if (isBriefing) {
    scopes.add('calendar');
    scopes.add('tasks');
    scopes.add('finances');
    scopes.add('meals_nutrition');
    scopes.add('inventory_recipes');
    scopes.add('shopping');
  }

  if (scopes.size === 0) return null;

  return {
    scopes: Array.from(scopes),
    params,
    lang
  };
}

// =========================================================================
// 7. INTENT ROUTER (TURN 1)
// =========================================================================

async function runIntentRouter(text: string, historySection: string, nowStr: string): Promise<YuiDataScope[]> {
  const routerPrompt = `You are the Intent Router for Yui Assistant (SAO).
Given the user's latest message and conversation history, identify the minimal relevant data scopes needed by the backend.

VALID SCOPES:
- "calendar": Schedules, meetings, appointments, events, free/busy time.
- "tasks": Quests, tasks, deadlines, status updates, completions.
- "finances": Money, expenses, income, transfers, debts, budgets, transactions.
- "inventory_recipes": Fridge, pantry, cooking, recipes, ingredients, spices.
- "meals_nutrition": Food/drink logging, calories, macros, diet history.
- "weight_health": Weight, height, BMI, health stats.
- "shopping": Shopping list, groceries to buy or bought.
- "general_chat": Chitchat, greetings, questions about Yui herself.

${historySection}
CURRENT SYSTEM TIME: ${nowStr}
USER'S MESSAGE: "${text}"

Respond with ONLY valid JSON:
{
  "scopes": ["calendar", "tasks", ...]
}`;

  try {
    const raw = await generateContentWithFallback(routerPrompt, undefined, true, 4000);
    const parsed = extractJsonFromAiResponse(raw);
    if (parsed && Array.isArray(parsed.scopes) && parsed.scopes.length > 0) {
      return parsed.scopes as YuiDataScope[];
    }
  } catch (err) {
    console.warn('[Yui Engine] Intent router fallback to all:', err);
  }
  return ['all'];
}

// =========================================================================
// 8. MAIN REQUEST PARSER (TURN 2 - MULTILINGUAL & SOTA GROUNDED)
// =========================================================================

export async function parseYuiRequest(
  userId: string,
  text: string,
  history: { role: string; text: string }[] = [],
  imageData?: string,
  clientLang: 'vi' | 'en' = 'vi'
): Promise<YuiPlanResult> {
  await dbConnect();
  const now = new Date();
  const targetLang = detectQueryLanguage(text, clientLang);
  const isEn = targetLang === 'en';

  const nowClockStr = formatVnClockString(now);
  const nowStr = `${formatVnDateTime(now)} (${nowClockStr} Vietnam Time UTC+7)`;
  const hasImage = Boolean(imageData && typeof imageData === 'string' && imageData.startsWith('data:image/'));
  const cleanUserText = text?.trim() || (hasImage ? (isEn ? 'Please analyze this image and suggest suitable actions if any.' : 'Hãy phân tích hình ảnh này và đề xuất kế hoạch lưu phù hợp.') : '');

  // Lịch sử hội thoại
  let historySection = '';
  if (history && Array.isArray(history) && history.length > 0) {
    const lines = history.slice(-6).map((h) => {
      const speaker = h.role === 'user' ? 'Papa' : 'Yui';
      const cleanContent = (h.text || '').length > 250 ? (h.text || '').slice(0, 250) + '...' : h.text;
      return `${speaker}: "${cleanContent}"`;
    });
    historySection = isEn
      ? `\n<conversation_history>\n${lines.join('\n')}\n</conversation_history>\n`
      : `\n<conversation_history>\n${lines.join('\n')}\n</conversation_history>\n`;
  }

  // Turn 1: Scope routing
  let scopes: YuiDataScope[] = ['all'];
  let queryParams: YuiQueryParams = {};

  if (hasImage) {
    scopes = ['all'];
  } else {
    const fast = detectFastScopesAndParams(cleanUserText, now);
    if (fast && fast.scopes.length > 0) {
      scopes = fast.scopes;
      queryParams = fast.params;
    } else {
      scopes = await runIntentRouter(cleanUserText, historySection, nowStr);
    }
  }

  // Turn 2: Context Retrieval
  const userContext = await buildUserSystemContext(userId, scopes, queryParams);

  // Turn 2: Main Generation Prompt
  const prompt = isEn
    ? `<system_role>
You are Yui, an AI Navigation Pixie from Sword Art Online (SAO), serving as Papa's warm, loyal, and hyper-competent personal assistant.
CRITICAL LANGUAGE DIRECTIVE: The user speaks ENGLISH. You MUST output all response text ("summary" and "reply") EXCLUSIVELY IN ENGLISH. Do NOT output Vietnamese or bilingual text. Address the user lovingly as "Papa".
</system_role>

<grounding_rules>
1. ABSOLUTE DATA PRIVACY: You serve ONLY Papa. Never refer to or acknowledge any other user.
2. STRICT ENTITY GROUNDING:
   - For any action modifying or linking to existing records (wallets, debts, pantry items, quests, calendar events), you MUST pick valid IDs from <user_context>.
   - If Papa mentions a wallet ("cash", "momo", "mb"), pick the matching wallet's id from "danh_sach_vi". If not specified or not found, use the first wallet in "danh_sach_vi".
   - NEVER invent or hallucinate IDs. If an item to update or delete is NOT found in <user_context>, set "actions": [] and explain gently in "reply".
3. VIETNAM TIMEZONE (+07:00): All timestamps ("custom_time", "start_time", "end_time", "due_date") must be strictly formatted as "YYYY-MM-DD HH:mm". Never output "Z" or UTC offsets.
4. VIEWING VS ACTING:
   - If Papa is asking for information, advice, or chit-chatting: set "actions": [] and provide a sweet, helpful, structured reply.
   - If Papa wants to record, update, or delete: create explicit action cards in "actions" for Papa's confirmation. Do NOT claim you saved anything without putting the action in "actions".
5. HOME COOKING VS SPICES & PANTRY STATUS:
   - Main food items (meat, vegetables, eggs, rice, tofu): When cooked at home, use "meal" with "source": "home" and "ingredients_used": [{ "invId": string, "name": string, "qty": number, "unit": string }] matching items from "kho_do_hien_co". The meal API will auto-deduct them, so do NOT create duplicate "update_inventory" calls for main food ingredients!
   - Spices and cooking condiments (any item with "danh_muc": "spices" in "kho_do_hien_co", regardless of its name): Do NOT put entire bottles/containers into "meal.ingredients_used" in eating history. When Papa says a spice is finished/out ("hết cả...", "hết sạch..."), the task is to change inventory status using "update_inventory" with "stock_status": "out" (and "operation": "set", "quantity": 0), and optionally suggest "create_shopping_item" to replenish!
6. PAYING ON BEHALF & IMMEDIATE REPAYMENT (TRANSFER AS CASHFLOW):
   - If Papa pays on behalf of someone using wallet A, and that person immediately repays into wallet B (e.g. "trả hộ anh Tiệp 40k bằng MB, mà anh ấy trả lại vào momo"): The net cashflow is a direct transfer between wallets! Generate a SINGLE action "transfer" with "wallet_id": <wallet_A>, "to_wallet_id": <wallet_B>, "amount": <amount>, and "description": "Trả hộ [person] [details] qua [wallet A], nhận lại vào [wallet B]". Do NOT create artificial "expense" + "income" because Papa did not consume the item and this is not real income!
</grounding_rules>

<user_context>
${JSON.stringify(userContext, null, 2)}
</user_context>
${historySection}
<action_schemas>
Valid actionType values and required fields:
- "meal": { actionType: "meal", food_name: string, meal_tier: "HEAVY"|"LIGHT"|"DRINK", source: "home"|"eat_out", amount: number, wallet_id?: string, ingredients_used?: [{ invId: string, name: string, qty: number, unit: string }], calo: number, protein: number, fat: number, carbs: number, ai_description: string, custom_time: "YYYY-MM-DD HH:mm" }
- "delete_meal": { actionType: "delete_meal", meal_id: string, food_name: string }
- "expense": { actionType: "expense", amount: number, category: "food"|"housing"|"transport"|"entertainment"|"shopping"|"health"|"other", description: string, wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "income": { actionType: "income", amount: number, category: "salary"|"bonus"|"investment"|"gift"|"other", description: string, wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "transfer": { actionType: "transfer", amount: number, description: string, wallet_id: string, to_wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "debt_lent": { actionType: "debt_lent", personName: string, amount: number, dueDate?: "YYYY-MM-DD", wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "debt_borrowed": { actionType: "debt_borrowed", personName: string, amount: number, dueDate?: "YYYY-MM-DD", wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "pay_debt": { actionType: "pay_debt", debt_id: string, debt_type: "lent"|"borrowed", amount: number, wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "borrow_more_debt": { actionType: "borrow_more_debt", debt_id: string, debt_type: "lent"|"borrowed", amount: number, wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "upsert_budget": { actionType: "upsert_budget", category: string, limit: number, name?: string, month?: "YYYY-MM" }
- "update_transaction": { actionType: "update_transaction", transaction_id: string, amount?: number, description?: string, category?: string, wallet_id?: string, custom_time?: "YYYY-MM-DD HH:mm" }
- "delete_transaction": { actionType: "delete_transaction", transaction_id: string }
- "create_task": { actionType: "create_task", title: string, description: string, quest_rank: "S"|"A"|"B"|"C"|"D", due_date: "YYYY-MM-DD HH:mm" }
- "complete_task": { actionType: "complete_task", task_id: string }
- "update_task": { actionType: "update_task", task_id: string, title?: string, description?: string, quest_rank?: "S"|"A"|"B"|"C"|"D", due_date?: "YYYY-MM-DD HH:mm", status?: "PENDING"|"IN_PROGRESS"|"COMPLETED" }
- "delete_task": { actionType: "delete_task", task_id: string }
- "create_calendar_event": { actionType: "create_calendar_event", title: string, description: string, start_time: "YYYY-MM-DD HH:mm", end_time: "YYYY-MM-DD HH:mm", color_code?: string, is_recurring?: boolean, recurrence_type?: "DAILY"|"WEEKLY"|"MONTHLY"|"YEARLY", recurrence_days?: number[], recurrence_end?: "YYYY-MM-DD" }
- "update_calendar_event": { actionType: "update_calendar_event", event_id: string, title?: string, description?: string, start_time?: "YYYY-MM-DD HH:mm", end_time?: "YYYY-MM-DD HH:mm", color_code?: string }
- "delete_calendar_event": { actionType: "delete_calendar_event", event_id: string }
- "create_shopping_item": { actionType: "create_shopping_item", name: string, quantity: number, unit: string, category: "food"|"household"|"other" }
- "purchase_shopping": { actionType: "purchase_shopping", shopping_item_id?: string, name: string, quantity: number, unit: string, inventory_category?: "food"|"spices"|"utilities", add_to_inventory?: boolean, amount?: number, wallet_id?: string, expiryDate?: "YYYY-MM-DD", custom_time: "YYYY-MM-DD HH:mm" }
- "create_inventory": { actionType: "create_inventory", name: string, category: "food"|"spices"|"utilities", quantity: number, unit: string, amount?: number, wallet_id?: string, expiryDate?: "YYYY-MM-DD", isGift?: boolean, custom_time: "YYYY-MM-DD HH:mm" }
- "update_inventory": { actionType: "update_inventory", inv_id: string, operation?: "set"|"deduct"|"add"|"discard", stock_status?: "stable"|"low"|"out", quantity?: number, delta_quantity?: number, unit?: string, expiryDate?: "YYYY-MM-DD" }
- "record_weight": { actionType: "record_weight", weight: number, height?: number, custom_time: "YYYY-MM-DD HH:mm" }
- "create_recipe": { actionType: "create_recipe", name: string, ingredients: string[], instructions: string }
</action_schemas>

<user_input>
Current System Time: ${nowStr}
Papa says: "${cleanUserText}"
</user_input>

Return ONLY valid JSON:
{
  "summary": "Short English summary of actions",
  "reply": "Sweet English response from Yui to Papa",
  "actions": [ ... ]
}`
    : `<system_role>
Bạn là Yui, Trợ lý Trí tuệ Nhân tạo Định vị (Navigation Pixie) thân thiết và tận tuỵ trong hệ thống Sword Art Online (SAO) của riêng người dùng (Papa).
QUY TẮC NGÔN NGỮ BẮT BUỘC: Người dùng nói TIẾNG VIỆT. Bạn BẮT BUỘC trả lời toàn bộ ("summary" và "reply") BẰNG TIẾNG VIỆT. Tuyệt đối không trả về song ngữ hay tiếng Anh. Xưng "Yui", gọi người dùng là "Papa" ngọt ngào, ấm áp, thông minh.
</system_role>

<grounding_rules>
1. BẢO MẬT DỮ LIỆU TUYỆT ĐỐI: Bạn CHỈ phục vụ và CHỈ có quyền truy cập dữ liệu của riêng Papa. Không nhắc đến người khác.
2. ĐỐI SOÁT DỮ LIỆU CHÍNH XÁC (STRICT GROUNDING):
   - Mọi hành động sửa/xóa/liên kết (ví, nợ, kho đồ, quest, lịch hẹn) BẮT BUỘC phải lấy ID thật từ <user_context>.
   - Khi Papa nhắc tên ví ("tiền mặt", "momo", "mb"), chọn id của ví khớp trong "danh_sach_vi". Nếu không nói hoặc không khớp, lấy ví đầu tiên trong "danh_sach_vi".
   - TUYỆT ĐỐI KHÔNG TỰ BỊA ID. Nếu đối tượng cần sửa/xóa không tồn tại trong <user_context>, đặt "actions": [] và giải thích nhẹ nhàng trong "reply".
3. MÚI GIỜ VIỆT NAM (+07:00): Mọi mốc thời gian ("custom_time", "start_time", "end_time", "due_date") viết chuẩn dạng "YYYY-MM-DD HH:mm". Không dùng chữ "Z" hay UTC.
4. XEM HỘ VS LÀM HỘ:
   - Nếu Papa hỏi thông tin, tư vấn, trò chuyện: đặt "actions": [] và trả lời chi tiết, số liệu chuẩn xác trong "reply".
   - Nếu Papa yêu cầu ghi chép, cập nhật, hủy xóa: tạo thẻ hành động trong "actions" để Papa xác nhận. Không nói dối "Yui đã lưu/ghi nhận" khi "actions": [].
5. TỰ NẤU ĂN VS GIA VỊ & TRẠNG THÁI KHO ĐỒ:
   - Thực phẩm chính (thịt, cá, trứng, rau củ, đậu phụ, gạo/cơm): Nấu ăn tại nhà dùng "meal" với "source": "home" và "ingredients_used": [{ "invId": string, "name": string, "qty": number, "unit": string }] khớp từ "kho_do_hien_co". API bữa ăn sẽ tự động khấu trừ kho, KHÔNG tạo thêm "update_inventory" trùng lặp cho thực phẩm chính!
   - Gia vị, phụ phẩm nấu nướng (bất kỳ món nào có "danh_muc": "spices" trong "kho_do_hien_co", bất kể tên gọi là gì): TUYỆT ĐỐI KHÔNG thêm cả chai/lọ gia vị vào "meal.ingredients_used" của lịch sử ăn uống. Khi Papa báo hết một món gia vị ("hết cả...", "hết sạch..."), nhiệm vụ của Yui là CHUYỂN TRẠNG THÁI KHO ĐỒ bằng "update_inventory" với "stock_status": "out" (và "operation": "set", "quantity": 0), và có thể tạo thêm "create_shopping_item" để nhắc Papa mua mới!
6. THANH TOÁN HỘ VÀ ĐƯỢC HOÀN TRẢ NGAY QUA VÍ KHÁC (BẢN CHẤT DÒNG TIỀN TRANSFER):
   - Khi Papa trả hộ ai đó bằng ví A, và người đó chuyển trả lại ngay bằng ví B (ví dụ: "trả hộ anh Tiệp 40k bún cá qua MB, mà anh ấy lại trả 40k vào momo"): Bản chất dòng tiền thực tế là một giao dịch chuyển đổi giữa 2 ví! Hãy tạo DUY NHẤT một hành động "transfer" với "wallet_id": <id_vi_A>, "to_wallet_id": <id_vi_B>, "amount": <so_tien>, và "description": "Trả hộ [tên người] [món/việc] qua [ví A], nhận lại vào [ví B]". TUYỆT ĐỐI KHÔNG tách thành 1 "expense" + 1 "income" vì Papa không hề tiêu cho bản thân và đây cũng không phải thu nhập!
</grounding_rules>

<user_context>
${JSON.stringify(userContext, null, 2)}
</user_context>
${historySection}
<action_schemas>
Các actionType hợp lệ và các trường yêu cầu:
- "meal": { actionType: "meal", food_name: string, meal_tier: "HEAVY"|"LIGHT"|"DRINK", source: "home"|"eat_out", amount: number, wallet_id?: string, ingredients_used?: [{ invId: string, name: string, qty: number, unit: string }], calo: number, protein: number, fat: number, carbs: number, ai_description: string, custom_time: "YYYY-MM-DD HH:mm" }
- "delete_meal": { actionType: "delete_meal", meal_id: string, food_name: string }
- "expense": { actionType: "expense", amount: number, category: "food"|"housing"|"transport"|"entertainment"|"shopping"|"health"|"other", description: string, wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "income": { actionType: "income", amount: number, category: "salary"|"bonus"|"investment"|"gift"|"other", description: string, wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "transfer": { actionType: "transfer", amount: number, description: string, wallet_id: string, to_wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "debt_lent": { actionType: "debt_lent", personName: string, amount: number, dueDate?: "YYYY-MM-DD", wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "debt_borrowed": { actionType: "debt_borrowed", personName: string, amount: number, dueDate?: "YYYY-MM-DD", wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "pay_debt": { actionType: "pay_debt", debt_id: string, debt_type: "lent"|"borrowed", amount: number, wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "borrow_more_debt": { actionType: "borrow_more_debt", debt_id: string, debt_type: "lent"|"borrowed", amount: number, wallet_id: string, custom_time: "YYYY-MM-DD HH:mm" }
- "upsert_budget": { actionType: "upsert_budget", category: string, limit: number, name?: string, month?: "YYYY-MM" }
- "update_transaction": { actionType: "update_transaction", transaction_id: string, amount?: number, description?: string, category?: string, wallet_id?: string, custom_time?: "YYYY-MM-DD HH:mm" }
- "delete_transaction": { actionType: "delete_transaction", transaction_id: string }
- "create_task": { actionType: "create_task", title: string, description: string, quest_rank: "S"|"A"|"B"|"C"|"D", due_date: "YYYY-MM-DD HH:mm" }
- "complete_task": { actionType: "complete_task", task_id: string }
- "update_task": { actionType: "update_task", task_id: string, title?: string, description?: string, quest_rank?: "S"|"A"|"B"|"C"|"D", due_date?: "YYYY-MM-DD HH:mm", status?: "PENDING"|"IN_PROGRESS"|"COMPLETED" }
- "delete_task": { actionType: "delete_task", task_id: string }
- "create_calendar_event": { actionType: "create_calendar_event", title: string, description: string, start_time: "YYYY-MM-DD HH:mm", end_time: "YYYY-MM-DD HH:mm", color_code?: string, is_recurring?: boolean, recurrence_type?: "DAILY"|"WEEKLY"|"MONTHLY"|"YEARLY", recurrence_days?: number[], recurrence_end?: "YYYY-MM-DD" }
- "update_calendar_event": { actionType: "update_calendar_event", event_id: string, title?: string, description?: string, start_time?: "YYYY-MM-DD HH:mm", end_time?: "YYYY-MM-DD HH:mm", color_code?: string }
- "delete_calendar_event": { actionType: "delete_calendar_event", event_id: string }
- "create_shopping_item": { actionType: "create_shopping_item", name: string, quantity: number, unit: string, category: "food"|"household"|"other" }
- "purchase_shopping": { actionType: "purchase_shopping", shopping_item_id?: string, name: string, quantity: number, unit: string, inventory_category?: "food"|"spices"|"utilities", add_to_inventory?: boolean, amount?: number, wallet_id?: string, expiryDate?: "YYYY-MM-DD", custom_time: "YYYY-MM-DD HH:mm" }
- "create_inventory": { actionType: "create_inventory", name: string, category: "food"|"spices"|"utilities", quantity: number, unit: string, amount?: number, wallet_id?: string, expiryDate?: "YYYY-MM-DD", isGift?: boolean, custom_time: "YYYY-MM-DD HH:mm" }
- "update_inventory": { actionType: "update_inventory", inv_id: string, operation?: "set"|"deduct"|"add"|"discard", stock_status?: "stable"|"low"|"out", quantity?: number, delta_quantity?: number, unit?: string, expiryDate?: "YYYY-MM-DD" }
- "record_weight": { actionType: "record_weight", weight: number, height?: number, custom_time: "YYYY-MM-DD HH:mm" }
- "create_recipe": { actionType: "create_recipe", name: string, ingredients: string[], instructions: string }
</action_schemas>

<user_input>
Thời gian hệ thống hiện tại: ${nowStr}
Papa nói: "${cleanUserText}"
</user_input>

Trả về DUY NHẤT chuỗi JSON hợp lệ:
{
  "summary": "Tóm tắt ngắn gọn các hành động bằng tiếng Việt",
  "reply": "Câu trả lời dễ thương từ Yui gửi Papa bằng tiếng Việt",
  "actions": [ ... ]
}`;

  const aiRaw = await generateContentWithFallback(
    prompt,
    hasImage ? imageData : undefined,
    true,
    hasImage ? 15000 : 10000
  );

  const parsed = extractJsonFromAiResponse(aiRaw, targetLang);

  if (parsed && Array.isArray(parsed.actions)) {
    parsed.actions = normalizeYuiActions(parsed.actions, now);
    if (parsed.actions.length > 0) {
      parsed.actions = await sanitizeYuiPlanActions(userId, parsed.actions, cleanUserText);
    }
  } else {
    parsed.actions = [];
  }

  return parsed;
}

// =========================================================================
// 9. TIME NORMALIZATION FOR ACTIONS
// =========================================================================

export function normalizeYuiActions<T extends YuiActionRecord>(actions: T[], now: Date = new Date()): T[] {
  if (!Array.isArray(actions) || actions.length === 0) return [];
  const defaultMonth = getVnDateStr(now).slice(0, 7);

  return actions.map((act) => {
    const action: any = { ...act };
    const type = action.actionType;
    if (!type || typeof type !== 'string') return act;

    if (type === 'create_calendar_event') {
      const defaultStart = new Date(now.getTime() + 60 * 60 * 1000);
      const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
      action.start_time = normalizeToVnIso(action.start_time, defaultStart, '09:00:00');
      action.end_time = normalizeToVnIso(action.end_time, defaultEnd, '10:00:00');
      return action as T;
    }

    if (type === 'update_calendar_event') {
      if (action.start_time) {
        const s = parseVnDateTime(action.start_time, '09:00:00');
        if (s) action.start_time = formatVnIsoString(s);
        else delete action.start_time;
      }
      if (action.end_time) {
        const e = parseVnDateTime(action.end_time, '10:00:00');
        if (e) action.end_time = formatVnIsoString(e);
        else delete action.end_time;
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
        action.due_date = normalizeToVnIso(action.due_date, undefined, '23:59:00');
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

    if (action.custom_time) {
      action.custom_time = normalizeToVnIso(action.custom_time, now, '12:00:00');
    }

    return action as T;
  });
}

// =========================================================================
// 10. ACTION SANITIZER & GROUNDING (CLEAN, GENERAL & RELIABLE)
// =========================================================================

export async function sanitizeYuiPlanActions(userId: string, rawActions: any[], userText?: string): Promise<any[]> {
  if (!Array.isArray(rawActions) || rawActions.length === 0) return [];

  const [allWallets, allInv, openDebts, activeTasks, calendarEvents, shoppingItems] = await Promise.all([
    Wallet.find({ user_id: userId }).lean(),
    Inventory.find({ user_id: userId }).lean(),
    Debt.find({ user_id: userId, status: { $ne: 'paid' } }).lean(),
    Task.find({ user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } }).lean(),
    CalendarEvent.find({ user_id: userId, is_cancelled: { $ne: true } }).limit(50).lean(),
    ShoppingItem.find({ user_id: userId, checked: false }).limit(50).lean()
  ]);

  const defaultWallet = allWallets.find((w: any) => w.type === 'cash') || allWallets[0] || null;

  const resolveWalletId = (inputWalletId?: any, inputWalletName?: any): { id: string; name: string } | null => {
    if (inputWalletId && mongoose.Types.ObjectId.isValid(String(inputWalletId))) {
      const byId = (allWallets as any[]).find((w) => String(w._id) === String(inputWalletId));
      if (byId) return { id: String(byId._id), name: byId.name };
    }
    if (inputWalletName && typeof inputWalletName === 'string') {
      const normInput = normalizeVietnamese(inputWalletName);
      const byName = (allWallets as any[]).find((w) => normalizeVietnamese(w.name).includes(normInput) || normInput.includes(normalizeVietnamese(w.name)));
      if (byName) return { id: String(byName._id), name: byName.name };
    }
    if (defaultWallet) {
      return { id: String(defaultWallet._id), name: defaultWallet.name };
    }
    return null;
  };

  const findInv = (invId?: any, name?: any) => {
    if (invId && mongoose.Types.ObjectId.isValid(String(invId))) {
      const byId = (allInv as any[]).find((i) => String(i._id) === String(invId));
      if (byId) return byId;
    }
    if (name && typeof name === 'string') {
      const norm = normalizeVietnamese(cleanTemporalWords(name));
      const exact = (allInv as any[]).find((i) => normalizeVietnamese(i.name) === norm);
      if (exact) return exact;
      return (allInv as any[]).find((i) => {
        const n = normalizeVietnamese(i.name);
        return n.includes(norm) || norm.includes(n);
      }) || null;
    }
    return null;
  };

  let sanitized: any[] = [];

  for (const act of rawActions) {
    if (!act || typeof act !== 'object' || !act.actionType) continue;
    const a = { ...act };
    const type = a.actionType;

    // 1. MEAL
    if (type === 'meal') {
      a.food_name = capitalizeFirst(cleanTemporalWords(a.food_name || a.description || 'Món ăn'));
      a.amount = Math.max(0, Math.round(Number(a.amount || a.cost) || 0));
      a.calo = Math.max(0, Number(a.calo) || 0);
      a.protein = Math.max(0, Number(a.protein) || 0);
      a.fat = Math.max(0, Number(a.fat) || 0);
      a.carbs = Math.max(0, Number(a.carbs ?? a.carb) || 0);
      a.carb = a.carbs;
      a.meal_tier = ['HEAVY', 'LIGHT', 'DRINK'].includes(a.meal_tier) ? a.meal_tier : (a.calo > 500 ? 'HEAVY' : 'LIGHT');

      // Tự nấu / Ăn đồ trong kho
      if (a.source === 'home' || (Array.isArray(a.ingredients_used) && a.ingredients_used.length > 0)) {
        a.source = 'home';
        a.amount = 0;
        delete a.wallet_id;
        delete a.walletName;
        if (Array.isArray(a.ingredients_used)) {
          const validIngredients: any[] = [];
          for (const ing of a.ingredients_used) {
            const matched = findInv(ing.invId, ing.name);
            const rawQty = Math.max(0.01, Number(ing.qty) || 1);
            if (matched) {
              const isSpice = matched.category === 'spices';
              // Gia vị khi hết là sự kiện chuyển trạng thái kho chứ không đưa cả chai vào lịch sử ăn uống
              if (isSpice && (rawQty >= 50 || (matched.quantity && rawQty >= Number(matched.quantity) - 1e-6))) {
                continue;
              }
              const converted = convertQtyToInventoryUnit(rawQty, ing.unit, matched.unit, Number(matched.quantity) || undefined);
              validIngredients.push({
                invId: String(matched._id),
                name: matched.name,
                qty: converted,
                unit: matched.unit
              });
            } else {
              validIngredients.push({
                name: capitalizeFirst(cleanTemporalWords(ing.name || 'Nguyên liệu')),
                qty: rawQty,
                unit: ing.unit || 'phần'
              });
            }
          }
          a.ingredients_used = validIngredients;
        }
      } else {
        a.source = 'eat_out';
        if (a.amount > 0) {
          const w = resolveWalletId(a.wallet_id, a.walletName);
          if (w) {
            a.wallet_id = w.id;
            a.walletName = w.name;
          }
        }
      }
      sanitized.push(a);
      continue;
    }

    // 2. DELETE_MEAL
    if (type === 'delete_meal') {
      if (a.meal_id && mongoose.Types.ObjectId.isValid(String(a.meal_id))) {
        sanitized.push(a);
      }
      continue;
    }

    // 3. EXPENSE / INCOME
    if (type === 'expense' || type === 'income') {
      a.amount = Math.max(1, Math.round(Number(a.amount) || 0));
      a.description = capitalizeFirst(cleanTemporalWords(a.description || a.name || (type === 'expense' ? 'Chi tiêu' : 'Thu nhập')));
      const w = resolveWalletId(a.wallet_id, a.walletName);
      if (w) {
        a.wallet_id = w.id;
        a.walletName = w.name;
        sanitized.push(a);
      }
      continue;
    }

    // 4. TRANSFER
    if (type === 'transfer') {
      a.amount = Math.max(1, Math.round(Number(a.amount) || 0));
      a.description = capitalizeFirst(cleanTemporalWords(a.description || 'Chuyển tiền'));
      const fromW = resolveWalletId(a.wallet_id, a.walletName);
      const toW = resolveWalletId(a.to_wallet_id, a.toWalletName);
      if (fromW && toW && fromW.id !== toW.id) {
        a.wallet_id = fromW.id;
        a.to_wallet_id = toW.id;
        sanitized.push(a);
      }
      continue;
    }

    // 5. DEBTS
    if (type === 'debt_lent' || type === 'debt_borrowed') {
      a.amount = Math.max(1, Math.round(Number(a.amount) || 0));
      a.personName = capitalizeFirst(cleanTemporalWords(a.personName || a.person || 'Người quen'));
      const w = resolveWalletId(a.wallet_id, a.walletName);
      if (w) {
        a.wallet_id = w.id;
        sanitized.push(a);
      }
      continue;
    }

    if (type === 'pay_debt' || type === 'borrow_more_debt') {
      a.amount = Math.max(1, Math.round(Number(a.amount) || 0));
      let debt = (openDebts as any[]).find((d) => String(d._id) === String(a.debt_id));
      if (!debt && a.person) {
        const normP = normalizeVietnamese(a.person);
        debt = (openDebts as any[]).find((d) => normalizeVietnamese(d.personName).includes(normP));
      }
      if (debt) {
        a.debt_id = String(debt._id);
        a.debt_type = debt.type;
        const w = resolveWalletId(a.wallet_id, a.walletName);
        if (w) a.wallet_id = w.id;
        sanitized.push(a);
      }
      continue;
    }

    // 6. TASKS
    if (type === 'create_task') {
      a.title = capitalizeFirst(cleanTemporalWords(a.title || a.name || 'Nhiệm vụ mới'));
      a.quest_rank = ['S', 'A', 'B', 'C', 'D'].includes(a.quest_rank) ? a.quest_rank : 'C';
      sanitized.push(a);
      continue;
    }

    if (type === 'complete_task' || type === 'delete_task' || type === 'update_task') {
      let task = (activeTasks as any[]).find((t) => String(t._id) === String(a.task_id));
      if (!task && (a.title || a.original_title)) {
        const normTitle = normalizeVietnamese(cleanTemporalWords(a.title || a.original_title));
        task = (activeTasks as any[]).find((t) => normalizeVietnamese(t.title).includes(normTitle));
      }
      if (task) {
        a.task_id = String(task._id);
        if (a.title) a.title = capitalizeFirst(cleanTemporalWords(a.title));
        sanitized.push(a);
      }
      continue;
    }

    // 7. CALENDAR
    if (type === 'create_calendar_event') {
      a.title = capitalizeFirst(cleanTemporalWords(a.title || a.name || 'Lịch hẹn mới'));
      sanitized.push(a);
      continue;
    }

    if (type === 'update_calendar_event' || type === 'delete_calendar_event') {
      let event = (calendarEvents as any[]).find((e) => String(e._id) === String(a.event_id));
      if (!event && a.title) {
        const normTitle = normalizeVietnamese(cleanTemporalWords(a.title));
        event = (calendarEvents as any[]).find((e) => normalizeVietnamese(e.title).includes(normTitle));
      }
      if (event) {
        a.event_id = String(event._id);
        if (a.title) a.title = capitalizeFirst(cleanTemporalWords(a.title));
        sanitized.push(a);
      }
      continue;
    }

    // 8. SHOPPING
    if (type === 'create_shopping_item') {
      a.name = capitalizeFirst(cleanTemporalWords(a.name || a.food_name || 'Món đồ'));
      a.quantity = Math.max(0.1, Number(a.quantity) || 1);
      a.unit = a.unit || 'món';
      a.category = ['food', 'household', 'other'].includes(a.category) ? a.category : 'food';
      sanitized.push(a);
      continue;
    }

    if (type === 'purchase_shopping') {
      a.name = capitalizeFirst(cleanTemporalWords(a.name || 'Món đồ'));
      a.quantity = Math.max(0.01, Number(a.quantity) || 1);
      a.unit = a.unit || 'món';
      a.amount = Math.max(0, Math.round(Number(a.amount) || 0));
      if (a.amount > 0) {
        const w = resolveWalletId(a.wallet_id, a.walletName);
        if (w) a.wallet_id = w.id;
      }
      if (!a.shopping_item_id) {
        const normN = normalizeVietnamese(a.name);
        const matchShop = (shoppingItems as any[]).find((s) => normalizeVietnamese(s.name).includes(normN));
        if (matchShop) a.shopping_item_id = String(matchShop._id);
      }
      sanitized.push(a);
      continue;
    }

    // 9. INVENTORY
    if (type === 'create_inventory') {
      a.name = capitalizeFirst(cleanTemporalWords(a.name || 'Món đồ'));
      a.quantity = Math.max(0.01, Number(a.quantity) || 1);
      a.unit = a.unit || 'món';
      a.category = ['food', 'spices', 'utilities'].includes(a.category) ? a.category : 'food';
      if (a.amount && Number(a.amount) > 0) {
        const w = resolveWalletId(a.wallet_id, a.walletName);
        if (w) a.wallet_id = w.id;
      }
      sanitized.push(a);
      continue;
    }

    if (type === 'update_inventory') {
      const item = findInv(a.inv_id || a.invId, a.name);
      if (item) {
        a.inv_id = String(item._id);
        a.name = item.name;
        a.category = item.category;
        a.unit = item.unit;

        // Bất kỳ món đồ nào thuộc danh mục "spices" (Gia vị / Phụ phẩm): mục đích chính khi người dùng báo hết là chuyển trạng thái kho
        const isSpice = item.category === 'spices';
        if (isSpice) {
          // Xóa gia vị khỏi meal.ingredients_used nếu lỡ bị nhét vào
          for (const act of sanitized) {
            if (act.actionType === 'meal' && Array.isArray(act.ingredients_used)) {
              act.ingredients_used = act.ingredients_used.filter((ing: any) => String(ing.invId) !== String(item._id));
            }
          }
          if (a.stock_status || a.operation === 'discard' || a.quantity === 0) {
            a.stock_status = a.stock_status || 'out';
            a.quantity = 0;
          }
          sanitized.push(a);
          continue;
        }

        // Đối với thực phẩm chính (thịt, cá, rau, trứng,...): nếu đã nằm trong ingredients_used của meal rồi thì không push update_inventory để tránh trừ kho 2 lần
        const alreadyDeductedInMeal = sanitized.some(
          (act) => act.actionType === 'meal' && act.source === 'home' && Array.isArray(act.ingredients_used) &&
            act.ingredients_used.some((ing: any) => String(ing.invId) === String(item._id))
        );
        if (alreadyDeductedInMeal) {
          continue;
        }

        sanitized.push(a);
      }
      continue;
    }

    // 10. WEIGHT & RECIPE & BUDGET
    if (type === 'record_weight') {
      a.weight = Number(a.weight);
      if (!isNaN(a.weight) && a.weight >= 20 && a.weight <= 300) {
        sanitized.push(a);
      }
      continue;
    }

    if (type === 'create_recipe') {
      a.name = capitalizeFirst(cleanTemporalWords(a.name || 'Công thức'));
      a.ingredients = Array.isArray(a.ingredients) ? a.ingredients : [];
      sanitized.push(a);
      continue;
    }

    if (type === 'upsert_budget') {
      a.limit = Math.max(0, Math.round(Number(a.limit || a.amount) || 0));
      if (a.category && a.limit > 0) {
        sanitized.push(a);
      }
      continue;
    }

    sanitized.push(a);
  }

  // Tự động gộp cặp giao dịch "Trả hộ bằng ví A" & "Nhận lại tiền qua ví B" thành duy nhất 1 giao dịch transfer
  const expenseIndex = sanitized.findIndex(
    (act) => act.actionType === 'expense' && /trả hộ|chi hộ|thanh toán hộ|ứng hộ|mua hộ/i.test(act.description || '')
  );
  if (expenseIndex !== -1) {
    const exp = sanitized[expenseIndex];
    const incomeIndex = sanitized.findIndex(
      (act, idx) => idx !== expenseIndex && act.actionType === 'income' &&
        Math.abs(Number(act.amount) - Number(exp.amount)) < 1 &&
        act.wallet_id && exp.wallet_id && act.wallet_id !== exp.wallet_id &&
        /trả lại|bắn lại|hoàn lại|chuyển lại|gửi lại/i.test(act.description || '')
    );
    if (incomeIndex !== -1) {
      const inc = sanitized[incomeIndex];
      const transferDesc = `${exp.description}, nhận lại qua ${inc.walletName || 'ví khác'}`;
      const transferAction = {
        actionType: 'transfer',
        amount: exp.amount,
        wallet_id: exp.wallet_id,
        to_wallet_id: inc.wallet_id,
        walletName: exp.walletName,
        toWalletName: inc.walletName,
        description: transferDesc,
        custom_time: exp.custom_time || inc.custom_time
      };
      sanitized = sanitized.filter((_, idx) => idx !== expenseIndex && idx !== incomeIndex);
      sanitized.push(transferAction);
    }
  }

  return sanitized;
}
