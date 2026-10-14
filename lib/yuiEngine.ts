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
import { getExpandedCalendarEvents } from '@/lib/calendarHelper';

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
 * Hàm trích xuất JSON an toàn tuyệt đối từ phản hồi của LLM,
 * tự động bóc tách kể cả khi model chèn thêm lời dẫn hay block markdown ```json ... ```.
 */
function extractJsonFromAiResponse(raw: string): any {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Phản hồi từ AI rỗng');
  }

  const cleaned = raw.trim();

  // 1. Thử parse trực tiếp
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2. Thử tìm khối code block ```json ... ``` hoặc ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Thử tìm cặp ngoặc nhọn { ... } ngoài cùng
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  console.error("Failed to extract JSON from AI response:", raw);
  throw new Error('Yui không thể định dạng dữ liệu, Papa thử lại giúp Yui nhé!');
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
 * Thu thập ngữ cảnh hệ thống có chọn lọc theo scopes của riêng User hiện tại.
 * Tiết kiệm 80% token, tăng tốc độ xử lý và loại bỏ nhiễu dữ liệu cho AI.
 */
export async function buildUserSystemContext(
  userId: string,
  scopes: YuiDataScope[] = ['all']
) {
  const isAll = scopes.includes('all');
  const needCalendar = isAll || scopes.includes('calendar');
  const needTasks = isAll || scopes.includes('tasks');
  const needFinances = isAll || scopes.includes('finances');
  // Nếu có ghi nhận bữa ăn hoặc chi tiêu, cần nạp ví để Yui chọn đúng ví
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
  const sevenDaysLater = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Tự động chuyển các task quá hạn thành OVERDUE nếu cần tasks
  if (needTasks) {
    await Task.updateMany(
      { user_id: userId, status: 'PENDING', due_date: { $lt: now } },
      { $set: { status: 'OVERDUE' } }
    );
  }

  // 2. Tải CÓ CHỌN LỌC các tài nguyên hệ thống (tất cả đều có filter user_id: userId)
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
    recentCompletedTasks,
    expandedCalendarEvents,
    todayMeals,
    latestWeight,
    shoppingItems,
    recipes
  ] = await Promise.all([
    User.findById(userId).lean(),
    needWallets ? Wallet.find({ user_id: userId }).lean() : Promise.resolve([]),
    needFinances ? Transaction.find({ user_id: userId, date: { $gte: monthStart } }).lean() : Promise.resolve([]),
    needFinances ? Transaction.find({ user_id: userId }).sort({ date: -1 }).limit(10).lean() : Promise.resolve([]),
    needFinances ? Debt.find({ user_id: userId, status: { $ne: 'paid' } }).lean() : Promise.resolve([]),
    needFinances ? Budget.find({ user_id: userId, month: currentMonthStr }).lean() : Promise.resolve([]),
    needInventory ? Inventory.find({ user_id: userId, quantity: { $gt: 0 } }).sort({ expiryDate: 1 }).limit(25).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: { $in: ['PENDING', 'IN_PROGRESS'] } }).sort({ due_date: 1 }).limit(15).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: 'OVERDUE' }).sort({ due_date: 1 }).limit(10).lean() : Promise.resolve([]),
    needTasks ? Task.find({ user_id: userId, status: 'COMPLETED' }).sort({ completed_at: -1 }).limit(5).lean() : Promise.resolve([]),
    needCalendar ? getExpandedCalendarEvents(userId, todayStart, sevenDaysLater) : Promise.resolve([]),
    needMeals ? MealLog.find({ user_id: userId, consumed_at: { $gte: todayStart } }).sort({ consumed_at: -1 }).lean() : Promise.resolve([]),
    needWeight ? WeightLog.findOne({ user_id: userId }).sort({ date: -1 }).lean() : Promise.resolve(null),
    needShopping ? ShoppingItem.find({ user_id: userId, checked: false }).limit(20).lean() : Promise.resolve([]),
    needInventory ? Recipe.find({ user_id: userId }).limit(20).lean() : Promise.resolve([]),
  ]);

  const context: Record<string, any> = {
    thong_tin_nhan_vat: {
      ten: (user as any)?.username || 'Papa',
      level: (user as any)?.level || 1,
      hp: `${(user as any)?.current_hp || 0}/${(user as any)?.max_hp || 1200}`,
      mp: `${(user as any)?.current_mp || 0}/${(user as any)?.max_mp || 500}`,
      exp: `${(user as any)?.current_exp || 0}/${((user as any)?.level || 1) * 500}`,
      chieu_cao_cm: (user as any)?.height || 170,
      buff_hom_nay: (user as any)?.ai_daily_buff || 'Không có'
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

    context.tai_chinh = {
      tong_so_du_tat_ca_vi: totalWalletBalance,
      danh_sach_vi: (wallets as any[]).map(w => ({
        id: w._id.toString(),
        name: w.name,
        type: w.type,
        balance: w.balance
      })),
      thang_hien_tai: {
        tong_thu: monthIncome,
        tong_chi: monthExpense,
        chi_theo_danh_muc: expenseByCategory,
        ngan_sach: (budgets as any[]).map(b => ({
          danh_muc: b.category,
          ten: b.name,
          han_muc: b.limit,
          da_tieu: expenseByCategory[b.category] || 0,
          con_lai: (b.limit || 0) - (expenseByCategory[b.category] || 0)
        }))
      },
      giao_dich_gan_day: (recentTx as any[]).map(t => ({
        ngay: new Date(t.date).toISOString().split('T')[0],
        loai: t.type,
        so_tien: t.amount,
        mo_ta: t.description,
        danh_muc: t.category,
        vi: t.walletName
      })),
      so_no_chua_tra: (openDebts as any[]).map(d => ({
        nguoi: d.personName,
        loai: d.type === 'lent' ? 'cho vay (họ nợ mình)' : 'đi vay (mình nợ họ)',
        con_lai: d.remainingAmount,
        tong: d.totalAmount,
        han_tra: d.dueDate ? new Date(d.dueDate).toISOString().split('T')[0] : null
      }))
    };
  } else if (needWallets) {
    // Nếu chỉ cần ghi nhận bữa ăn/chi tiêu nhẹ, chỉ cấp danh sách ví để chọn nguồn
    context.danh_sach_vi = (wallets as any[]).map(w => ({
      id: w._id.toString(),
      name: w.name,
      type: w.type,
      balance: w.balance
    }));
  }

  // Kho đồ tủ lạnh & Công thức nấu ăn
  if (needInventory) {
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringInventory = (inventoryItems as any[]).filter(item =>
      item.expiryDate && new Date(item.expiryDate) <= threeDaysLater
    );

    context.kho_do_va_cong_thuc = {
      kho_do_sap_het_han: expiringInventory.map(i => ({
        ten: i.name,
        so_luong: `${i.quantity} ${i.unit}`,
        han_su_dung: new Date(i.expiryDate).toISOString().split('T')[0]
      })),
      kho_do_hien_co: (inventoryItems as any[]).map(i => ({
        ten: i.name,
        so_luong: `${i.quantity} ${i.unit}`,
        danh_muc: i.category
      })),
      cong_thuc_nau_an_da_luu: (recipes as any[]).map(r => ({
        ten: r.name,
        nguyen_lieu: r.ingredients || []
      }))
    };
  }

  // Nhiệm vụ & Quests
  if (needTasks) {
    context.nhiem_vu_quests = {
      can_lam_hom_nay_va_sap_toi: (activeTasks as any[]).map(t => ({
        id: t._id.toString(),
        tieu_de: t.title,
        rank: t.quest_rank,
        trang_thai: t.status,
        han_chot: new Date(t.due_date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        han_chot_iso: new Date(t.due_date).toISOString()
      })),
      qua_han: (overdueTasks as any[]).map(t => ({
        id: t._id.toString(),
        tieu_de: t.title,
        rank: t.quest_rank,
        han_chot: new Date(t.due_date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      })),
      moi_hoan_thanh: (recentCompletedTasks as any[]).map(t => ({
        tieu_de: t.title,
        rank: t.quest_rank,
        hoan_thanh_luc: t.completed_at ? new Date(t.completed_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : null
      }))
    };
  }

  // Lịch trình (mở rộng đầy đủ cả sự kiện một lần và sự kiện lặp lại)
  if (needCalendar) {
    const todayEvents = (expandedCalendarEvents as any[]).filter(e => {
      const eStart = new Date(e.start_time);
      const eEnd = new Date(e.end_time);
      return eStart <= todayEnd && eEnd >= todayStart;
    });

    const upcoming7DaysEvents = (expandedCalendarEvents as any[]).filter(e => {
      const eStart = new Date(e.start_time);
      return eStart > todayEnd;
    });

    context.lich_trinh = {
      tong_so_su_kien_hom_nay: todayEvents.length,
      su_kien_hom_nay: todayEvents.map(e => ({
        id: e._id.toString(),
        tieu_de: e.title,
        thoi_gian: `${new Date(e.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })} - ${new Date(e.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}`,
        bat_dau: new Date(e.start_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        bat_dau_iso: new Date(e.start_time).toISOString(),
        ket_thuc: new Date(e.end_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        ket_thuc_iso: new Date(e.end_time).toISOString(),
        ghi_chu: e.description || '',
        la_lich_lap: !!(e.is_recurring || e.is_virtual || e.parent_event_id),
        loai_lap: e.recurrence_type || null
      })),
      su_kien_sap_toi_7_ngay: upcoming7DaysEvents.slice(0, 15).map(e => ({
        id: e._id.toString(),
        tieu_de: e.title,
        bat_dau: new Date(e.start_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        bat_dau_iso: new Date(e.start_time).toISOString(),
        ket_thuc: new Date(e.end_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        ket_thuc_iso: new Date(e.end_time).toISOString(),
        ghi_chu: e.description || '',
        la_lich_lap: !!(e.is_recurring || e.is_virtual || e.parent_event_id),
        loai_lap: e.recurrence_type || null
      }))
    };
  }

  // Sức khỏe & Bữa ăn
  if (needMeals || needWeight) {
    let todayCalories = 0;
    let todayProtein = 0;
    let todayFat = 0;
    let todayCarbs = 0;
    let todayHpRestored = 0;
    (todayMeals as any[]).forEach(m => {
      todayCalories += m.calo || 0;
      todayProtein += m.protein || 0;
      todayFat += m.fat || 0;
      todayCarbs += m.carbs || 0;
      todayHpRestored += m.hp_restored || 0;
    });

    context.suc_khoe_va_bua_an = {
      hom_nay: needMeals ? {
        tong_calo: todayCalories,
        protein_g: todayProtein,
        fat_g: todayFat,
        carbs_g: todayCarbs,
        hp_da_hoi: todayHpRestored,
        cac_bua_an: (todayMeals as any[]).map(m => ({
          mon: m.food_name,
          loai_bua: m.meal_tier,
          calo: m.calo,
          gia_tien: m.cost || 0,
          thoi_gian: new Date(m.consumed_at).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
        }))
      } : undefined,
      can_nang_gan_nhat_kg: (latestWeight as any)?.weight || null
    };
  }

  // Danh sách mua sắm
  if (needShopping) {
    context.danh_sach_mua_sam_can_mua = (shoppingItems as any[]).map(s => ({
      id: s._id.toString(),
      ten: s.name,
      so_luong: `${s.quantity} ${s.unit}`,
      danh_muc: s.category
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
  const nowStr = `${now.toISOString()} (${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})`;

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
  // LƯỢT 1: ĐỊNH TUYẾN Ý ĐỊNH & PHẠM VI DỮ LIỆU CẦN THIẾT (INTENT ROUTER)
  // =========================================================================
  let detectedScopes: YuiDataScope[] = ['all'];

  const routerPrompt = `Bạn là hệ thống phân loại ý định (Intent Router) của Trợ lý ảo Yui (SAO).
Dựa vào câu nói mới nhất của Papa và lịch sử đối thoại, hãy xác định các mảng dữ liệu nghiệp vụ (scopes) mà hệ thống CẦN TRUY XUẤT từ Database để cung cấp cho Yui trả lời hoặc thực thi.

CÁC MẢNG NGHIỆP VỤ (SCOPES) HỢP LỆ:
- "calendar": Lịch trình, cuộc hẹn, sự kiện diễn ra hôm nay / tuần này, sự kiện lặp lại, thêm sự kiện mới ("hôm nay có lịch gì?", "hôm nay có rảnh không?", "thêm lịch họp lúc 14h chiều nay").
- "tasks": Nhiệm vụ, Quest SAO, việc cần làm hôm nay, việc quá hạn, hoàn thành quest, tạo quest mới ("hôm nay có nhiệm vụ gì?", "xong quest dọn dẹp").
- "finances": Tiền nong, kiểm tra số dư ví, báo cáo chi tiêu, thu nhập, lịch sử giao dịch, vay nợ, ngân sách, hoặc khi thực hiện hành động chi tiêu/thu tiền.
- "inventory_recipes": Tủ lạnh, kho thực phẩm, đồ sắp hết hạn, công thức nấu ăn, tư vấn nấu món từ nguyên liệu có sẵn ("kho có gì?", "nấu được món gì?").
- "meals_nutrition": Ghi nhận món ăn/uống ("vừa ăn phở", "uống cà phê"), calo nạp trong ngày, macro dinh dưỡng, hồi phục HP.
- "weight_health": Cập nhật hoặc xem cân nặng, chiều cao, chỉ số sức khỏe ("cập nhật cân nặng 47kg", "hôm nay nặng bao nhiêu").
- "shopping": Danh sách mua sắm cần mua ("thêm sữa vào danh sách shopping").
- "general_chat": Chào hỏi, tâm sự thông thường, cảm ơn, hỏi thăm Yui (không cần dữ liệu chuyên sâu).

QUY TẮC:
1. Nếu câu nói yêu cầu nhiều mảng (vd: "ăn phở 40k bằng ví momo" -> ["finances", "meals_nutrition"]; "hôm nay tôi phải làm gì?" -> ["calendar", "tasks"]), hãy chọn đầy đủ các scopes.
2. Với câu hỏi phụ thuộc ngữ cảnh trước (vd câu trước vừa hỏi kho còn gì, câu này hỏi "nấu món gì từ số đồ này?"), hãy dựa vào lịch sử để chọn ["inventory_recipes"].
3. Nếu không chắc chắn hoặc câu hỏi rộng bao quát cả ngày, hãy chọn ["calendar", "tasks", "finances"].
${historySection}
CÂU NÓI MỚI NHẤT CỦA PAPA:
"${text}"

Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm văn bản nào khác):
{
  "scopes": ["calendar", ...]
}`;

  try {
    const routeResRaw = await generateContentWithFallback(routerPrompt, undefined, true);
    const routeJson = extractJsonFromAiResponse(routeResRaw);
    if (routeJson?.scopes && Array.isArray(routeJson.scopes) && routeJson.scopes.length > 0) {
      detectedScopes = routeJson.scopes as YuiDataScope[];
    }
  } catch (err) {
    console.warn("Yui Router Turn 1 fallback to all:", err);
    detectedScopes = ['all'];
  }

  // =========================================================================
  // LƯỢT 2: TRUY XUẤT DỮ LIỆU CHUYÊN SÂU THEO SCOPES & SOẠN CÂU TRẢ LỜI / ACTIONS
  // =========================================================================
  const userContext = await buildUserSystemContext(userId, detectedScopes);

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

QUY TẮC VỀ LỊCH TRÌNH VÀ SỰ KIỆN LẶP (CALENDAR & RECURRING EVENTS):
- Khi Papa hỏi về lịch trình ("hôm nay có lịch gì không?", "hôm nay có việc gì làm?", "lịch hôm nay thế nào?", "hôm nay có rảnh không?"):
  * BẮT BUỘC kiểm tra trường "lich_trinh.su_kien_hom_nay" trong DỮ LIỆU HIỆN TẠI!
  * Danh sách này ĐÃ ĐƯỢC hệ thống mở rộng và tính toán chính xác cho cả các sự kiện lặp lại (hàng ngày, hàng tuần, hàng năm).
  * Nếu "lich_trinh.su_kien_hom_nay" có sự kiện (kể cả có cờ 'la_lich_lap': true), TUYỆT ĐỐI KHÔNG ĐƯỢC báo ngày trống! Hãy liệt kê cụ thể từng sự kiện với mốc thời gian ('thoi_gian'), tiêu đề ('tieu_de'), ghi chú ('ghi_chu') và loại lặp ('loai_lap') nếu có, rồi nhắc nhở Papa chuẩn bị chu đáo.
  * Chỉ khi "lich_trinh.tong_so_su_kien_hom_nay" === 0 và "nhiem_vu_quests.can_lam_hom_nay_va_sap_toi" cũng không có việc thì mới báo hôm nay Papa rảnh rỗi.

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
  }

  return executedResults;
}
