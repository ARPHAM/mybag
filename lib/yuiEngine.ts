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
import { generateContentWithFallback } from '@/lib/ai';
import { getExpandedCalendarEvents, formatVnDateTime, formatVnDateOnly, getVnDayOfWeek } from '@/lib/calendarHelper';

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

  // 1. Lịch trình & Cuộc hẹn
  const isCalendarQuery =
    /\b(lich|hen|hop|meeting|su kien|event|thoi gian bieu|ranh|ban|lich trinh|timeline|agenda)\b/.test(nt) ||
    (/\b(co viec gi|lam gi|phai lam gi|co gi lam)\b/.test(nt) && dateRes !== null);

  if (isCalendarQuery) {
    scopes.add('calendar');
    if (dateRes) {
      params.calendar = {
        date_start: dateRes.start.toISOString(),
        date_end: dateRes.end.toISOString(),
        target_date_label: dateRes.label
      };
    }
  }

  // 2. Câu hỏi tổng quan ngày hôm nay ("hôm nay có gì", "hôm nay thế nào")
  if (/\b(hom nay co gi|hom nay the nao|hom nay co viec gi|co viec gi lam)\b/.test(nt)) {
    scopes.add('calendar');
    scopes.add('tasks');
  }

  // 3. Nhiệm vụ & Quests SAO
  if (/\b(nhiem vu|quest|task|todo|deadline|han chot|qua han|tre han|hoan thanh|xong viec|can lam)\b/.test(nt)) {
    scopes.add('tasks');
    params.tasks = {};
    if (/\b(qua han|tre han)\b/.test(nt)) {
      params.tasks.status = 'OVERDUE';
    } else if (/\b(hoan thanh|da xong|xong)\b/.test(nt)) {
      params.tasks.status = 'COMPLETED';
    }
    const rankMatch = nt.match(/\brank\s+([sabcd])\b/);
    if (rankMatch) {
      params.tasks.quest_rank = rankMatch[1].toUpperCase() as any;
    }
  }

  // 4. Tài chính & Ví & Tiền nong
  const isFinanceAmount = /\b\d+\s*(k|tr|trieu|nghin|ngan|dong|d|vnd)\b/.test(nt);
  const isFinanceKeyword = /\b(tien|vi|chi|tieu|thu|nap|rut|luong|giao dich|vay|no|muon|tra ho|doi no|ngan sach|han muc|so du|ngan hang|bank|atm|momo|zalopay|vcb|mb|techcombank|tcb|vietcombank|ck|chuyen khoan|tien mat|hoa don|bill|ton bao nhieu|het bao nhieu)\b/.test(nt);

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
  }

  // 5. Bữa ăn & Dinh dưỡng
  const isMealAction = /\b(an|uong|bua sang|bua trua|bua toi|bua dem|diem tam|lot da|nhau)\b/.test(nt);
  const isNutrition = /\b(calo|kcal|protein|carb|fat|chat beo|tinh bot|macro|dinh duong)\b/.test(nt);

  if (isMealAction || isNutrition) {
    scopes.add('meals_nutrition');
    if (isFinanceAmount || /\b(tien|k|vnd|d|dong)\b/.test(nt)) {
      scopes.add('finances');
    }
    if (dateRes) {
      params.meals = {
        date_start: dateRes.start.toISOString(),
        date_end: dateRes.end.toISOString(),
        target_date_label: dateRes.label
      };
    }
  }

  // 6. Kho đồ tủ lạnh & Công thức nấu ăn
  const isStorage = /\b(tu lanh|kho|nguyen lieu|thuc pham|gia vi|ton kho|het han|bao quan|cat vao tu)\b/.test(nt);
  const isCooking = /\b(cong thuc|nau|che bien|cach lam|huong dan|lam mon|mon gi|nau gi|thuc don|menu)\b/.test(nt);

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

  // 8. Danh sách mua sắm
  if (/\b(mua sam|shopping|di cho|sieu thi|danh sach mua|can mua)\b/.test(nt)) {
    scopes.add('shopping');
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
export async function buildUserSystemContext(
  userId: string,
  scopes: YuiDataScope[] = ['all'],
  params: YuiQueryParams = {}
) {
  const isAll = scopes.includes('all');
  const needCalendar = isAll || scopes.includes('calendar');
  const needTasks = isAll || scopes.includes('tasks');
  const needFinances = isAll || scopes.includes('finances');
  const needWallets = needFinances || isAll || scopes.includes('meals_nutrition');
  const needInventory = isAll || scopes.includes('inventory_recipes');
  const needMeals = isAll || scopes.includes('meals_nutrition');
  const needWeight = isAll || scopes.includes('weight_health');
  const needShopping = isAll || scopes.includes('shopping');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Tính mốc ngày hôm nay chuẩn xác theo múi giờ Việt Nam (Asia/Ho_Chi_Minh: UTC+7)
  const vnFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayVnStr = vnFormatter.format(now); // "YYYY-MM-DD"
  const todayStart = new Date(`${todayVnStr}T00:00:00+07:00`);
  const todayEnd = new Date(`${todayVnStr}T23:59:59.999+07:00`);

  // Tính các mốc tuần này và tuần tới chuẩn theo múi giờ Việt Nam
  const vnDay = getVnDayOfWeek(todayStart);
  const daysSinceMonday = vnDay === 0 ? 6 : vnDay - 1;
  const daysUntilSunday = vnDay === 0 ? 0 : 7 - vnDay;

  const thisMondayStart = new Date(todayStart.getTime() - daysSinceMonday * 86400000);
  const thisSundayEnd = new Date(todayStart.getTime() + (daysUntilSunday + 1) * 86400000 - 1);
  const nextMondayStart = new Date(thisSundayEnd.getTime() + 1);
  const nextSundayEnd = new Date(nextMondayStart.getTime() + 7 * 86400000 - 1);
  const thirtyDaysLater = new Date(todayEnd.getTime() + 30 * 86400000);

  // 1. Tự động chuyển các task quá hạn (cả PENDING lẫn IN_PROGRESS) thành OVERDUE
  if (needTasks) {
    await Task.updateMany(
      { user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS'] }, due_date: { $lt: now } },
      { $set: { status: 'OVERDUE' } }
    );
  }

  // 2. Xác định phạm vi query động cho Calendar
  const hasSpecificCalendar = needCalendar && !!params?.calendar?.date_start && !!params?.calendar?.date_end;
  const calStart = hasSpecificCalendar ? new Date(params.calendar!.date_start!) : todayStart;
  const calEnd = hasSpecificCalendar ? new Date(params.calendar!.date_end!) : thirtyDaysLater;

  // 3. Xác định phạm vi query động cho Bữa ăn
  const hasSpecificMeals = needMeals && !!params?.meals?.date_start && !!params?.meals?.date_end;
  const mealStart = hasSpecificMeals ? new Date(params.meals!.date_start!) : todayStart;
  const mealEnd = hasSpecificMeals ? new Date(params.meals!.date_end!) : todayEnd;

  // 4. Tải CÓ CHỌN LỌC & ĐÚNG MỤC TIÊU các tài nguyên hệ thống
  const [
    user,
    wallets,
    monthTx,
    recentTx,
    openDebts,
    budgets,
    inventoryItems,
    activeTasks,
    overdueTasks,
    expandedCalendarEvents,
    targetedMeals,
    latestWeight,
    shoppingItems,
    recipes,
    requestedRecipe
  ] = await Promise.all([
    User.findById(userId).lean(),
    needWallets ? Wallet.find({ user_id: userId }).lean() : Promise.resolve([]),
    needFinances ? Transaction.find({ user_id: userId, date: { $gte: monthStart } }).select('amount type category date walletName').lean() : Promise.resolve([]),
    needFinances ? Transaction.find({ user_id: userId }).sort({ date: -1 }).limit(3).lean() : Promise.resolve([]),
    needFinances ? Debt.find({ user_id: userId, status: { $ne: 'paid' } }).lean() : Promise.resolve([]),
    needFinances ? Budget.find({ user_id: userId, month: currentMonthStr }).lean() : Promise.resolve([]),
    needInventory ? Inventory.find({ user_id: userId, quantity: { $gt: 0 } }).sort({ expiryDate: 1 }).limit(25).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS'] } }).sort({ due_date: 1 }).limit(5).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: 'OVERDUE' }).sort({ due_date: 1 }).limit(5).lean() : Promise.resolve([]),
    needCalendar ? getExpandedCalendarEvents(userId, calStart, calEnd) : Promise.resolve([]),
    needMeals ? MealLog.find({ user_id: userId, consumed_at: { $gte: mealStart, $lte: mealEnd } }).sort({ consumed_at: -1 }).lean() : Promise.resolve([]),
    needWeight ? WeightLog.findOne({ user_id: userId }).sort({ date: -1 }).lean() : Promise.resolve(null),
    needShopping ? ShoppingItem.find({ user_id: userId, checked: false }).limit(15).lean() : Promise.resolve([]),
    needInventory ? Recipe.find({ user_id: userId }).select('name ingredients').limit(15).lean() : Promise.resolve([]),
    needInventory && params?.inventory_recipes?.recipe_name
      ? Recipe.findOne({ user_id: userId, name: new RegExp(params.inventory_recipes.recipe_name, 'i') }).lean()
      : Promise.resolve(null),
  ]);

  const context: Record<string, any> = {
    thong_tin_nhan_vat: {
      ten: (user as any)?.username || 'Papa',
      level: (user as any)?.level || 1,
      hp: `${(user as any)?.current_hp || 0}/${(user as any)?.max_hp || 1200}`,
      mp: `${(user as any)?.current_mp || 0}/${(user as any)?.max_mp || 500}`,
      chieu_cao_cm: (user as any)?.height || 170,
    }
  };

  // Tài chính & Ví
  if (needFinances) {
    let monthIncome = 0;
    let monthExpense = 0;
    const expenseByCategory: Record<string, number> = {};
    (monthTx as any[]).forEach(t => {
      if (t.type === 'income') monthIncome += t.amount || 0;
      else if (t.type === 'expense') {
        monthExpense += t.amount || 0;
        const c = t.category || 'other';
        expenseByCategory[c] = (expenseByCategory[c] || 0) + (t.amount || 0);
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
      chi_tiet_theo_yeu_cau: specificCategoryData || highlightedWallet,
      giao_dich_moi_nhat: (recentTx as any[]).map(t => ({
        ngay: new Date(t.date).toISOString().split('T')[0],
        loai: t.type,
        so_tien: t.amount,
        mo_ta: t.description,
        vi: t.walletName
      })),
      so_no_chua_tra: (openDebts as any[]).map(d => ({
        nguoi: d.personName,
        loai: d.type === 'lent' ? 'cho vay' : 'đi vay',
        con_lai: d.remainingAmount
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
    const threeDaysLater = new Date(now.getTime() + 3 * 86400000);
    const expiringInventory = (inventoryItems as any[]).filter(item =>
      item.expiryDate && new Date(item.expiryDate) <= threeDaysLater
    );

    context.kho_do_va_cong_thuc = {
      kho_do_sap_het_han: expiringInventory.slice(0, 5).map(i => ({
        ten: i.name,
        so_luong: `${i.quantity} ${i.unit}`,
        han_su_dung: new Date(i.expiryDate).toISOString().split('T')[0]
      })),
      kho_do_hien_co: (inventoryItems as any[]).slice(0, 15).map(i => ({
        ten: i.name,
        so_luong: `${i.quantity} ${i.unit}`
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
        han_chot: formatVnDateTime(t.due_date)
      })),
      can_lam_uu_tien: (activeTasks as any[]).map(t => ({
        id: t._id.toString(),
        tieu_de: t.title,
        rank: t.quest_rank,
        han_chot: formatVnDateTime(t.due_date)
      }))
    };
  }

  // Lịch trình (Xử lý truy vấn động theo ngày cụ thể hoặc tổng quan)
  if (needCalendar) {
    const formatEventForYui = (e: any) => ({
      id: e._id.toString(),
      tieu_de: e.title,
      thu_va_ngay: formatVnDateOnly(e.start_time),
      thoi_gian: `${new Date(e.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })} - ${new Date(e.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}`,
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
      // TRƯỜNG HỢP 2: Tra cứu tổng quan (hôm nay có gì / tình hình tuần)
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

      const upcomingNext3 = (expandedCalendarEvents as any[])
        .filter(e => new Date(e.start_time) > todayEnd)
        .slice(0, 3);

      context.lich_trinh = {
        thong_tin_thoi_gian: {
          hom_nay: formatVnDateOnly(todayStart),
          tuan_nay: `${formatVnDateOnly(thisMondayStart)} đến ${formatVnDateOnly(thisSundayEnd)}`,
          tuan_toi: `${formatVnDateOnly(nextMondayStart)} đến ${formatVnDateOnly(nextSundayEnd)}`
        },
        su_kien_hom_nay: todayEvents.map(formatEventForYui),
        so_su_kien_con_lai_tuan_nay: restOfThisWeekEvents.length,
        so_su_kien_tuan_toi: nextWeekEvents.length,
        su_kien_sap_toi_gan_nhat: upcomingNext3.map(formatEventForYui)
      };
    }
  }

  // Sức khỏe & Bữa ăn (Xử lý ngày cụ thể như hôm qua hoặc mặc định hôm nay)
  if (needMeals || needWeight) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    (targetedMeals as any[]).forEach(m => {
      totalCalories += m.calo || 0;
      totalProtein += m.protein || 0;
      totalFat += m.fat || 0;
      totalCarbs += m.carbs || 0;
    });

    context.suc_khoe_va_bua_an = {
      khoang_thoi_gian: hasSpecificMeals ? (params.meals!.target_date_label || 'Ngày yêu cầu') : 'Hôm nay',
      tong_calo: totalCalories,
      macro: { protein_g: totalProtein, fat_g: totalFat, carbs_g: totalCarbs },
      cac_bua_an: (targetedMeals as any[]).map(m => ({
        mon: m.food_name,
        loai_bua: m.meal_tier,
        calo: m.calo,
        gia_tien: m.cost || 0,
        thoi_gian: new Date(m.consumed_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
      })),
      can_nang_gan_nhat_kg: (latestWeight as any)?.weight || null
    };
  }

  // Danh sách mua sắm
  if (needShopping) {
    context.danh_sach_mua_sam_can_mua = (shoppingItems as any[]).map(s => ({
      id: s._id.toString(),
      ten: s.name,
      so_luong: `${s.quantity} ${s.unit}`
    }));
  }

  return context;
}

/**
 * Phân tích yêu cầu tự nhiên từ người dùng bằng kiến trúc 2 lượt (2-Turn Intent Routing & Scoped Execution):
 * - Lượt 1: Phân loại ý định, xác định đúng các scopes dữ liệu cần thiết (siêu nhẹ ~150 tokens, cực nhanh).
 * - Lượt 2: Truy xuất đúng dữ liệu nghiệp vụ theo scopes, đưa ra câu trả lời và hành động chính xác, không bị loãng context.
 */
export async function parseYuiRequest(
  userId: string,
  text: string,
  history: { role: string; text: string }[] = []
) {
  await dbConnect();
  const now = new Date();
  const nowStr = `${formatVnDateTime(now)} (ISO: ${now.toISOString()})`;

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

  // BƯỚC 1.1: Fast-Path Regex & Dynamic Date Resolver (0ms, không tốn AI token/quota, chống 429 rate limit)
  const fastResult = detectFastScopesAndParams(text, now);
  if (fastResult && fastResult.scopes.length > 0) {
    detectedScopes = fastResult.scopes;
    detectedParams = fastResult.params;
  } else {
    // BƯỚC 1.2: AI Router (Chỉ gọi khi câu hỏi phức tạp hoặc phụ thuộc lịch sử ngữ cảnh)
    const routerPrompt = `Bạn là hệ thống phân loại ý định (Intent Router) của Trợ lý ảo Yui (SAO).
Dựa vào câu nói mới nhất của Papa và lịch sử đối thoại, hãy xác định các mảng dữ liệu nghiệp vụ (scopes) và các tham số truy vấn động (params) để hệ thống BE truy xuất đúng trọng tâm.

CÁC MẢNG NGHIỆP VỤ (SCOPES) HỢP LỆ:
- "calendar": Lịch trình, cuộc hẹn, sự kiện. Nếu Papa hỏi ngày cụ thể (vd: "lịch CN tuần này", "ngày mai có rảnh không"), hãy trích xuất vào params.
- "tasks": Nhiệm vụ, Quest SAO. Nếu hỏi việc quá hạn, việc rank S, trích xuất vào params.
- "finances": Tiền nong, kiểm tra số dư ví, báo cáo chi tiêu, thu nhập, vay nợ. Nếu hỏi ví cụ thể (momo, mb) hay danh mục (ăn uống), trích xuất vào params.
- "inventory_recipes": Tủ lạnh, kho thực phẩm, đồ sắp hết hạn, công thức nấu ăn. Nếu hỏi cách nấu món cụ thể đã lưu, trích xuất tên món vào params.
- "meals_nutrition": Ghi nhận món ăn/uống, calo nạp trong ngày, macro dinh dưỡng. Nếu hỏi ngày hôm qua/ngày cụ thể, trích xuất vào params.
- "weight_health": Cập nhật hoặc xem cân nặng, chiều cao, chỉ số sức khỏe.
- "shopping": Danh sách mua sắm cần mua.
- "general_chat": Chào hỏi, tâm sự thông thường.

${historySection}
THỜI ĐIỂM HIỆN TẠI CỦA HỆ THỐNG:
${nowStr}

CÂU NÓI MỚI NHẤT CỦA PAPA:
"${text}"

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
      const routeResRaw = await generateContentWithFallback(routerPrompt, undefined, true);
      const routeJson = extractJsonFromAiResponse(routeResRaw);
      if (Array.isArray(routeJson)) {
        detectedScopes = routeJson as YuiDataScope[];
      } else if (routeJson?.scopes && Array.isArray(routeJson.scopes) && routeJson.scopes.length > 0) {
        detectedScopes = routeJson.scopes as YuiDataScope[];
        if (routeJson.params && typeof routeJson.params === 'object') {
          detectedParams = routeJson.params;
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

  // =========================================================================
  // LƯỢT 2: TRUY XUẤT DỮ LIỆU ĐỘNG THEO SCOPES & PARAMS & SOẠN CÂU TRẢ LỜI
  // =========================================================================
  const userContext = await buildUserSystemContext(userId, detectedScopes, detectedParams);

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
"${text}"

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
    1. Giới thiệu món ăn và điểm đặc biệt (ví dụ: phiên bản sốt cà chua sẽ có màu đỏ óng ánh tự nhiên, vị chua thanh ngọt dịu từ cà chua chín quyện với sườn non thơm lừng, thịt mềm đậm đà).
    2. Danh sách nguyên liệu chuẩn bị rõ ràng (kèm định lượng phù hợp cho 2-4 người).
    3. Các bước chế biến chi tiết, dễ làm: Sơ chế & chần sườn; Làm sốt cà chua chua ngọt; Nấu/rim sườn; Hoàn thành & bí quyết để sườn mềm, không bị khô.
  * VỀ HÀNH ĐỘNG ("actions"): BẮT BUỘC tạo một hành động { actionType: "create_recipe", ... } để Papa có thể bấm nút xác nhận lưu công thức vào hệ thống Thực Đơn của mình chỉ với 1 click:
    {
      "actionType": "create_recipe",
      "name": "Tên món ăn (chuẩn hoá, vd: Sườn xào chua ngọt sốt cà chua)",
      "ingredients": ["định lượng + nguyên liệu 1", "định lượng + nguyên liệu 2", ...],
      "instructions": "Các bước nấu tóm tắt: B1: Sơ chế... B2: Nấu sốt cà chua... B3: Xào rim sườn... B4: Hoàn thành..."
    }
  * Nếu Papa yêu cầu phiên bản cụ thể (ví dụ: "phiên bản với cà chua", "phiên bản không cay", "ít đường"...), hãy cá nhân hoá đúng chuẩn theo yêu cầu đó!

QUY TẮC BẮT BUỘC VỀ VÍ / TÀI KHOẢN KHI CÓ NHIỀU NGUỒN (MULTI-WALLET):
- Khi người dùng đề cập nhiều hành động chi tiêu/thu tiền với nhiều ví khác nhau trong cùng một câu:
  (Ví dụ: "ăn phở 50k bằng mb, uống cà phê 20k bằng momo"):
  - TỪNG hành động trong mảng "actions" BẮT BUỘC phải mang "wallet_id" và "walletName" CHÍNH XÁC tương ứng với tài khoản/ví mà người dùng chỉ định cho món đó!
  - Hành động 1: amount: 50000, wallet_id: "<id ví MB>", walletName: "MB Bank"
  - Hành động 2: amount: 20000, wallet_id: "<id ví Momo>", walletName: "Ví Momo"
  - TUYỆT ĐỐI KHÔNG GỘP CHUNG VÍ nếu người dùng đã chỉ định 2 nguồn khác nhau!

QUY TẮC CHUẨN HOÁ TÊN MÓN VÀ MÔ TẢ (CHỐNG LỖI TỪ OUTDATE):
- Tuyệt đối LOẠI BỎ mọi từ chỉ thời gian tương đối khỏi "food_name", "title" và "description" như:
  "sáng nay", "trưa nay", "chiều nay", "tối nay", "hôm nay", "hôm qua", "vừa ăn", "vừa mới", "mới mua", "lúc nãy", "buổi sáng", "bữa sáng"...
  Ví dụ:
  - User nói: "sáng nay ăn bánh mì 25k bằng mb" -> food_name: "Bánh mì", description: "Bánh mì" (KHÔNG ĐƯỢC để "Bánh mì sáng nay").
  - User nói: "trưa nay ăn bún chả 45k" -> food_name: "Bún chả", description: "Bún chả".
  - User nói: "uống sinh tố bơ tối qua" -> food_name: "Sinh tố bơ", description: "Sinh tố bơ".
- Nếu câu nói có từ chỉ thời gian trong ngày ("sáng nay", "trưa nay", "chiều nay", "tối qua"...), hãy xác định thời điểm thực tế và lưu vào trường "custom_time" (chuỗi ISO 8601):
  * "sáng nay" / "buổi sáng": khoảng 08:00 sáng hôm nay.
  * "trưa nay" / "buổi trưa": khoảng 12:00 trưa hôm nay.
  * "chiều nay" / "buổi chiều": khoảng 15:30 chiều hôm nay.
  * "tối nay" / "buổi tối": khoảng 19:00 tối hôm nay.
  * "hôm qua": lùi lại 1 ngày so với hiện tại.
  * Mặc định là thời gian hiện tại nếu không nói rõ.

QUY TẮC ĐÁNH GIÁ DINH DƯỠNG & CALO (CHUẨN CHUYÊN GIA DINH DƯỠNG):
- Bạn đóng vai trò một chuyên gia dinh dưỡng thực thụ (tương đồng với bộ máy phân tích macro chuyên sâu của MyBag).
- BẮT BUỘC ước tính calo dựa trên MỘT KHẨU PHẦN ĂN TIÊU CHUẨN ĐẦY ĐỦ CỦA NGƯỜI VIỆT NAM (tính cả dầu mỡ chiên xào, gia vị, nhân thịt, tinh bột, sốt, đồ ăn kèm). Không ước lượng quá thấp như thực phẩm thô chưa chế biến!
  Tham chiếu thực tế:
  * 1 ổ Bánh mì kẹp đầy đủ (thịt/chả/pate, bơ, sốt, đồ chua): 380 - 450 kcal.
  * 1 bát Phở bò / Bún bò Huế / Bún chả: 480 - 580 kcal.
  * 1 đĩa Cơm tấm sườn bì chả / Cơm rang dưa bò: 680 - 850 kcal.
  * 1 phần Xôi xéo / xôi thịt: 450 - 550 kcal.
  * 1 ly Cà phê sữa / Trà sữa trân châu: 180 - 420 kcal.
- BẮT BUỘC cung cấp trường "ai_description" cho mỗi action meal:
  Mô tả chi tiết nguyên liệu, thành phần và ƯỚC TÍNH ĐỊNH LƯỢNG cụ thể của khẩu phần ăn (vd: "1 ổ bánh mì kẹp (~120g) gồm 75g bánh mì, 35g thịt nguội/chả, 15g pate, dưa leo, ngò và sốt bơ trứng. Cung cấp khoảng 420 kcal giàu protein và carb, nạp năng lượng nhanh cho cơ thể.", khoảng 2-3 câu). Tuyệt đối không để trống hoặc chỉ ghi chung chung!

QUY TẮC VỀ LỊCH TRÌNH VÀ THỨ TRONG TUẦN (CALENDAR & WEEKDAY ACCURACY):
- Trong dữ liệu "lich_trinh" đã có sẵn trường "thu_va_ngay" (Ví dụ: "Thứ Tư, ngày 14/10/2026", "Chủ Nhật, ngày 18/10/2026") được hệ thống tính toán chính xác tuyệt đối theo lịch thiên văn.
- Thời gian hiện tại của hệ thống: ${nowStr}.
- BẮT BUỘC SỬ DỤNG CHÍNH XÁC THỨ TRONG TUẦN TỪ TRƯỜNG "thu_va_ngay", TUYỆT ĐỐI KHÔNG TỰ TÍNH NHẨM HOẶC SUY DIỄN THỨ TRONG TUẦN!
  (Ví dụ: Ngày 14/10/2026 là Thứ Tư; Ngày 18/10/2026 là Chủ Nhật; TUYỆT ĐỐI KHÔNG ĐƯỢC báo 14/10 là Thứ Ba hay 18/10 là Thứ Bảy).
- Khi Papa hỏi về lịch trình:
  * Nếu trong "lich_trinh" có trường "muc_tieu_tra_cuu" (ví dụ: "Chủ Nhật tuần này", "Ngày mai", "Thứ Sáu..."):
    -> Đây là dữ liệu được BE truy vấn CHÍNH XÁC theo thời điểm Papa vừa hỏi!
    -> Hãy kiểm tra "lich_trinh.danh_sach_su_kien": nếu có sự kiện, hãy liệt kê chi tiết (thời gian, tiêu đề, ghi chú); nếu rỗng hoặc có trường "trang_thai", hãy thông báo ngọt ngào rằng thời gian đó Papa hoàn toàn rảnh rỗi!
  * Nếu Papa hỏi tổng quan ("hôm nay có lịch gì?", "thế lịch hôm nay có gì?", "hôm nay thế nào?"):
    -> Kiểm tra trường "lich_trinh.su_kien_hom_nay"!
  * Nếu Papa hỏi tổng quan tuần này / tuần tới:
    -> Dựa vào các số liệu tóm tắt "so_su_kien_con_lai_tuan_nay", "so_su_kien_tuan_toi" và "su_kien_sap_toi_gan_nhat" để trả lời ngắn gọn, gợi mở cho Papa!
  * Chỉ khi danh sách sự kiện cần xem rỗng và "nhiem_vu_quests.can_lam_uu_tien" cũng không có việc thì mới báo khoảng thời gian đó Papa rảnh rỗi.


NHIỆM VỤ CỦA BẠN:
1. XEM HỘ (Tra cứu, hỏi thông tin, tình hình, hỏi ý kiến, trò chuyện):
   - Nếu Papa chỉ hỏi về thông tin hệ thống hoặc hỏi gợi ý (vd: "hôm nay có việc gì làm?", "lịch hôm nay thế nào?", "ví còn bao nhiêu tiền?", "tủ lạnh còn gì ăn?", "nấu được món gì từ những nguyên liệu này?", "hôm nay ăn bao nhiêu calo rồi?"):
     -> "actions": []
     -> "reply": Trả lời chi tiết, đáng yêu, chính xác dựa trên số liệu thực tế ở trên và ngữ cảnh hội thoại.
   - Nếu Papa hỏi gợi ý (vd "nấu được món gì?", "nên làm gì trước?"):
     -> Dựa vào kho đồ tủ lạnh có sẵn, công thức đã lưu, lịch trình hôm nay, quest rank cao / sắp tới hạn, hoặc calo cần nạp để đưa ra lời khuyên chân thành và tối ưu nhất!


2. LÀM HỘ (Yêu cầu ghi chép, tạo mới, hoàn thành việc gì đó vào DB):
   - Khi Papa muốn ghi data mới vào hệ thống (Yui sẽ lên kế hoạch để Papa BẤM XÁC NHẬN trên giao diện trước khi ghi thật vào DB):
   - Phân tích và bóc tách thành danh sách các hành động trong "actions".
   - Các actionType hợp lệ:
     a) "meal": Món ăn/uống Papa tự nạp (VD: "vừa ăn phở bò 45k trả bằng Momo", "uống cốc sinh tố bơ").
        - Fields: { actionType: "meal", food_name: string (ĐÃ LỌC BỎ từ chỉ thời gian), meal_tier: "HEAVY"|"LIGHT"|"DRINK", calo: number, protein: number, fat: number, carbs: number, sugar: number, amount: number (0 nếu miễn phí/tự nấu), wallet_id: string, walletName: string, description: string, ai_description: string, custom_time: ISO 8601 string }
     b) "expense": Chi tiêu thông thường không phải ăn uống tự ăn (VD: "mua xăng 50k bằng tiền mặt", "trả tiền điện 300k").
        - Fields: { actionType: "expense", amount: number, category: "housing"|"transport"|"entertainment"|"shopping"|"health"|"other", description: string (ĐÃ LỌC BỎ từ chỉ thời gian), wallet_id: string, walletName: string, custom_time: ISO 8601 string }
     c) "income": Tiền thu vào (VD: "nhận lương 15tr vào MB", "được thưởng 500k").
        - Fields: { actionType: "income", amount: number, category: "salary"|"bonus"|"investment"|"gift"|"other", description: string, wallet_id: string, walletName: string, custom_time: ISO 8601 string }
     d) "debt_lent": Cho vay / Trả tiền hộ ai đó (VD: "trả hộ anh Nam 50k tiền ăn trưa").
        - Fields: { actionType: "debt_lent", person: string, amount: number, description: string, wallet_id: string, walletName: string, custom_time: ISO 8601 string }
     e) "debt_borrowed": Đi vay tiền ai đó (VD: "vay bạn Hùng 200k").
        - Fields: { actionType: "debt_borrowed", person: string, amount: number, description: string, wallet_id: string, walletName: string, custom_time: ISO 8601 string }
     f) "create_task": Tạo Quest/Nhiệm vụ mới (VD: "tạo quest rank B nộp báo cáo trước 17h chiều mai").
        - Fields: { actionType: "create_task", title: string, description: string, quest_rank: "S"|"A"|"B"|"C"|"D", due_date: ISO 8601 string (tính dựa vào thời gian hiện tại) }
     g) "complete_task": Hoàn thành Quest đã có (VD: "đã xong quest dọn dẹp phòng").
        - Fields: { actionType: "complete_task", task_id: string (so khớp với id trong danh sách quest active), title: string }
     h) "create_calendar_event": Thêm sự kiện lịch trình (VD: "thêm lịch họp với sếp 14h chiều nay").
        - Fields: { actionType: "create_calendar_event", title: string, description: string, start_time: ISO 8601 string, end_time: ISO 8601 string, color_code: "#00f0ff"|"#ffaa00"|"#ff4444"|"#b900ff" }
     i) "create_shopping_item": Thêm món cần mua vào danh sách shopping (VD: "thêm 2 hộp sữa tươi và 1 chai dầu ăn vào danh sách mua sắm").
        - Fields: { actionType: "create_shopping_item", name: string, quantity: number, unit: string, category: "food"|"household"|"other" }
     j) "create_inventory": Thêm đồ vào kho đồ / tủ lạnh (VD: "vừa mua 5 gói mì Hảo Hảo cất vào tủ").
        - Fields: { actionType: "create_inventory", name: string, quantity: number, unit: string, category: string, expiryDate: ISO 8601 string (nếu có đề cập hạn dùng) }
     k) "record_weight": Ghi nhận / Cập nhật cân nặng và chiều cao (VD: "cập nhật cân nặng hôm nay là 47kg", "cân nặng 52kg", "hôm nay nặng 48kg").
        - Fields: { actionType: "record_weight", weight: number (số kg, vd: 47), height: number (chiều cao cm nếu có nhắc đến), custom_time: ISO 8601 string, description: "Cập nhật cân nặng" }
     l) "create_recipe": Tạo hoặc lưu công thức nấu ăn mới vào Sổ tay Thực đơn của Papa (VD: "tạo công thức nấu ăn sườn xào chua ngọt phiên bản với cà chua", "lưu công thức canh kim chi").
        - Fields: { actionType: "create_recipe", name: string, ingredients: string[], instructions: string }

YÊU CẦU TRẢ VỀ:
Trả về DUY NHẤT một chuỗi JSON hợp lệ không bọc thêm bất kỳ văn bản nào ngoài JSON:
{
  "summary": "Tóm tắt ngắn gọn các hành động chuẩn bị thực hiện",
  "reply": "Câu trả lời thân mật của Yui gửi Papa (BẮT BUỘC khi actions rỗng; khi có actions thì giải thích kế hoạch để Papa xác nhận)",
  "actions": [ ... ]
}`;

  const aiRaw = await generateContentWithFallback(prompt, undefined, true);
  return extractJsonFromAiResponse(aiRaw);
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

    // Trích xuất ngày giờ tùy chỉnh (nếu có nói về "sáng nay", "hôm qua", v.v.)
    let actionDate = now;
    if (action.custom_time) {
      const parsedTime = new Date(action.custom_time);
      if (!isNaN(parsedTime.getTime())) {
        actionDate = parsedTime;
      }
    }

    // 1. MEAL
    if (actionType === 'meal') {
      const amount = Number(action.amount) || 0;
      let txId: any = undefined;

      // Chuẩn hóa tên món và mô tả (loại bỏ từ outdate)
      const rawFoodName = action.food_name || action.description || 'Món ăn';
      const cleanFoodName = capitalizeFirst(cleanTemporalWords(rawFoodName)) || 'Bữa ăn';

      if (amount > 0) {
        if (action.wallet_id) {
          await Wallet.findOneAndUpdate(
            { _id: action.wallet_id, user_id: userId },
            { $inc: { balance: -amount } }
          );
        }
        const tx = await Transaction.create({
          user_id: userId,
          type: 'expense',
          amount,
          date: actionDate,
          description: `Ăn uống: ${cleanFoodName}`,
          category: 'food',
          wallet_id: action.wallet_id || undefined,
          walletName: action.walletName || 'Ví không xác định'
        });
        txId = tx._id;
      }

      const calo = Math.max(0, Number(action.calo) || 0);
      const hp = Math.floor(calo * 1.0); // 1 calo = 1 HP
      const tier = ['HEAVY', 'LIGHT', 'DRINK'].includes(action.meal_tier) ? action.meal_tier : 'LIGHT';

      // Mô tả dinh dưỡng chuyên sâu từ AI, không còn hardcode "Ghi nhận bởi Yui"
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
        cost: amount,
        ai_status: 'completed',
        ai_description: aiDesc,
        source: 'eat_out',
        transaction_id: txId,
        wallet_id: amount > 0 ? action.wallet_id : undefined
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
        amount,
        hp,
        walletName: action.walletName
      });
      continue;
    }

    // 2. EXPENSE
    if (actionType === 'expense') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const rawDesc = action.description || 'Chi tiêu';
      const cleanDesc = capitalizeFirst(cleanTemporalWords(rawDesc)) || 'Chi tiêu';

      if (action.wallet_id) {
        await Wallet.findOneAndUpdate(
          { _id: action.wallet_id, user_id: userId },
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
        wallet_id: action.wallet_id || undefined,
        walletName: action.walletName || 'Ví không xác định'
      });

      executedResults.push({
        type: 'expense',
        id: tx._id,
        amount,
        description: tx.description,
        walletName: action.walletName
      });
      continue;
    }

    // 3. INCOME
    if (actionType === 'income') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const rawDesc = action.description || 'Thu nhập';
      const cleanDesc = capitalizeFirst(cleanTemporalWords(rawDesc)) || 'Thu nhập';

      if (action.wallet_id) {
        await Wallet.findOneAndUpdate(
          { _id: action.wallet_id, user_id: userId },
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
        wallet_id: action.wallet_id || undefined,
        walletName: action.walletName || 'Ví không xác định'
      });

      executedResults.push({
        type: 'income',
        id: tx._id,
        amount,
        description: tx.description,
        walletName: action.walletName
      });
      continue;
    }

    // 4. DEBT LENT (Cho vay / Trả hộ)
    if (actionType === 'debt_lent') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const rawDesc = action.description || '';
      const cleanDesc = cleanTemporalWords(rawDesc);

      if (action.wallet_id) {
        await Wallet.findOneAndUpdate(
          { _id: action.wallet_id, user_id: userId },
          { $inc: { balance: -amount } }
        );
        await Transaction.create({
          user_id: userId,
          type: 'expense',
          amount,
          date: actionDate,
          description: `Trả hộ / Cho vay: ${action.person || 'Khác'}${cleanDesc ? ` - ${cleanDesc}` : ''}`,
          category: 'other',
          wallet_id: action.wallet_id,
          walletName: action.walletName || 'Ví không xác định'
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
          walletName: action.walletName || 'Tiền mặt'
        }]
      });

      executedResults.push({
        type: 'debt_lent',
        id: debt._id,
        amount,
        person: action.person,
        walletName: action.walletName
      });
      continue;
    }

    // 5. DEBT BORROWED (Đi vay)
    if (actionType === 'debt_borrowed') {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) continue;

      const rawDesc = action.description || '';
      const cleanDesc = cleanTemporalWords(rawDesc);

      if (action.wallet_id) {
        await Wallet.findOneAndUpdate(
          { _id: action.wallet_id, user_id: userId },
          { $inc: { balance: amount } }
        );
        await Transaction.create({
          user_id: userId,
          type: 'income',
          amount,
          date: actionDate,
          description: `Đi vay: ${action.person || 'Khác'}${cleanDesc ? ` - ${cleanDesc}` : ''}`,
          category: 'other',
          wallet_id: action.wallet_id,
          walletName: action.walletName || 'Ví không xác định'
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
          walletName: action.walletName || 'Tiền mặt'
        }]
      });

      executedResults.push({
        type: 'debt_borrowed',
        id: debt._id,
        amount,
        person: action.person,
        walletName: action.walletName
      });
      continue;
    }

    // 6. CREATE TASK / QUEST
    if (actionType === 'create_task') {
      const rawTitle = action.title?.trim() || 'Nhiệm vụ mới';
      const cleanTitle = capitalizeFirst(cleanTemporalWords(rawTitle)) || 'Nhiệm vụ mới';
      const questRank = ['S', 'A', 'B', 'C', 'D'].includes(action.quest_rank) ? action.quest_rank : 'C';
      const dueDate = action.due_date ? new Date(action.due_date) : new Date(Date.now() + 24 * 60 * 60 * 1000);

      const task = await Task.create({
        user_id: userId,
        title: cleanTitle,
        description: action.description || '',
        quest_rank: questRank,
        due_date: isNaN(dueDate.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : dueDate,
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
      let task = null;
      if (action.task_id) {
        task = await Task.findOne({ _id: action.task_id, user_id: userId });
      }
      if (!task && action.title) {
        const cleanTitle = cleanTemporalWords(action.title);
        task = await Task.findOne({
          user_id: userId,
          status: { $ne: 'COMPLETED' },
          title: new RegExp(cleanTitle || action.title.trim(), 'i')
        });
      }

      if (task && task.status !== 'COMPLETED') {
        task.status = 'COMPLETED';
        task.completed_at = now;
        await task.save();

        // Thưởng EXP & MP
        const user = await User.findById(userId);
        let rewardExp = 50;
        let leveledUp = false;

        if (user) {
          rewardExp = EXP_REWARDS[task.quest_rank as keyof typeof EXP_REWARDS] || 50;
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

    // 8. CREATE CALENDAR EVENT
    if (actionType === 'create_calendar_event') {
      const rawTitle = action.title?.trim() || 'Sự kiện mới';
      const cleanTitle = capitalizeFirst(cleanTemporalWords(rawTitle)) || 'Sự kiện mới';
      const startTime = action.start_time ? new Date(action.start_time) : now;
      const endTime = action.end_time ? new Date(action.end_time) : new Date(startTime.getTime() + 60 * 60 * 1000);

      const event = await CalendarEvent.create({
        user_id: userId,
        title: cleanTitle,
        description: action.description || '',
        start_time: isNaN(startTime.getTime()) ? now : startTime,
        end_time: isNaN(endTime.getTime()) ? new Date(startTime.getTime() + 60 * 60 * 1000) : endTime,
        color_code: action.color_code || '#00f0ff',
        is_recurring: false
      });

      executedResults.push({
        type: 'create_calendar_event',
        id: event._id,
        title: event.title,
        start_time: event.start_time
      });
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

    // 10. CREATE INVENTORY ITEM
    if (actionType === 'create_inventory') {
      const rawName = action.name?.trim() || 'Vật phẩm';
      const cleanName = capitalizeFirst(cleanTemporalWords(rawName)) || 'Vật phẩm';
      const quantity = Math.max(1, Number(action.quantity) || 1);
      const unit = action.unit?.trim() || 'món';
      const category = action.category?.trim() || 'food';
      const expiryDate = action.expiryDate ? new Date(action.expiryDate) : undefined;

      const item = await Inventory.create({
        user_id: userId,
        name: cleanName,
        category,
        quantity,
        originalQuantity: quantity,
        unit,
        purchaseDate: now,
        expiryDate: expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate : undefined,
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

    // 11. RECORD WEIGHT / HEALTH
    if (actionType === 'record_weight') {
      const weight = Number(action.weight);
      if (weight && weight > 0) {
        const user = await User.findById(userId);
        if (user) {
          if (action.height && Number(action.height) > 0) {
            user.height = Number(action.height);
          }

          const recordDate = action.custom_time ? new Date(action.custom_time) : now;
          const startOfDay = new Date(recordDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(recordDate);
          endOfDay.setHours(23, 59, 59, 999);

          // Xoá log cũ cùng ngày để tránh trùng lặp
          await WeightLog.findOneAndDelete({
            user_id: userId,
            date: { $gte: startOfDay, $lte: endOfDay }
          });

          const weightLog = await WeightLog.create({
            user_id: userId,
            weight,
            date: recordDate
          });

          // Gamification: Thưởng 100 EXP
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
