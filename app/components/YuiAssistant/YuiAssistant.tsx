"use client";

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  X,
  Utensils,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Users,
  HandCoins,
  Check,
  CheckSquare,
  CheckCircle2,
  Calendar,
  CalendarDays,
  CalendarX2,
  Repeat,
  Clock,
  ShoppingCart,
  ShoppingBag,
  Package,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Scale,
  ChefHat,
  CreditCard,
  Pencil,
  Trash2,
  ImagePlus,
  Mic,
  MicOff,
  Bell,
  ChevronDown,
  ChevronUp,
  Eraser
} from 'lucide-react';
import { compressImageFile } from '@/lib/imageClient';
import {
  formatVnIsoString,
  fromVnDatetimeLocalValue,
  getYuiActionScheduleDisplay,
  toVnDatetimeLocalValue
} from '@/lib/vnTime';
import { getYuiBriefing, parseYuiMessage, executeYuiActions } from './api';
import styles from './YuiAssistant.module.css';

type Msg =
  | { role: 'user'; text: string; imagePreview?: string }
  | { role: 'yui'; text: string; plan?: any; done?: boolean; createdAt?: string };

interface WalletOption {
  id: string;
  name: string;
  balance: number;
}

interface ProactiveAlert {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  category: string;
  title: string;
  detail: string;
  suggestedPrompt: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript?: string;
}

interface SpeechRecognitionResultLike {
  0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results?: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const WELCOME_MSG: Msg = {
  role: 'yui',
  text: 'Chào Papa! Yui đây ✨ Yui là trợ lý riêng đồng hành cùng Papa trong thế giới SAO này. Papa có thể nhắn, nói bằng Micro, hoặc gửi ảnh hóa đơn / món ăn / cân nặng để Yui xử lý giúp Papa nha! (Yui sẽ luôn hiện bảng xác nhận để Papa kiểm tra hoặc sửa nhanh trước khi lưu vào hệ thống ạ).'
};

const fmt = (n: number) => (Number(n) || 0).toLocaleString('vi-VN');

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Ăn uống',
  housing: 'Nhà cửa & Sinh hoạt',
  transport: 'Đi lại',
  entertainment: 'Giải trí',
  shopping: 'Mua sắm',
  health: 'Sức khoẻ',
  other: 'Khác'
};

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ làm',
  IN_PROGRESS: 'Đang làm',
  COMPLETED: 'Hoàn thành'
};

const WEEKDAY_SHORT: Record<number, string> = {
  0: 'CN',
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7'
};

const WALLET_ACTION_TYPES = new Set([
  'meal',
  'expense',
  'income',
  'transfer',
  'debt_lent',
  'debt_borrowed',
  'pay_debt',
  'purchase_shopping',
  'update_transaction'
]);

const CATEGORY_ACTION_TYPES = new Set(['expense', 'upsert_budget', 'update_transaction']);
const TASK_ACTION_TYPES = new Set(['create_task', 'update_task']);
const CALENDAR_ACTION_TYPES = new Set(['create_calendar_event', 'update_calendar_event']);

function getTitleFieldKey(actionType: string): string {
  if (actionType === 'meal') return 'food_name';
  if (['create_task', 'update_task', 'delete_task', 'complete_task', 'create_calendar_event', 'update_calendar_event', 'delete_calendar_event'].includes(actionType)) {
    return 'title';
  }
  if (['create_shopping_item', 'purchase_shopping', 'create_inventory', 'update_inventory', 'create_recipe'].includes(actionType)) {
    return 'name';
  }
  if (['debt_lent', 'debt_borrowed', 'pay_debt'].includes(actionType)) {
    return 'person';
  }
  return 'description';
}

function formatRecurrenceSummary(a: any): string | null {
  if (!a?.is_recurring) return null;
  const type = String(a.recurrence_type || 'WEEKLY').toUpperCase();
  if (type === 'DAILY') return 'Lặp hàng ngày';
  if (type === 'MONTHLY') return 'Lặp hàng tháng';
  if (type === 'YEARLY') return 'Lặp hàng năm';
  if (Array.isArray(a.recurrence_days) && a.recurrence_days.length > 0) {
    const days = a.recurrence_days
      .map((d: number) => WEEKDAY_SHORT[Number(d)])
      .filter(Boolean)
      .join(', ');
    return days ? `Lặp hàng tuần (${days})` : 'Lặp hàng tuần';
  }
  return 'Lặp hàng tuần';
}

interface InlineEditorProps {
  action: any;
  fallbackTime?: string;
  wallets: WalletOption[];
  onChange: (patch: Record<string, unknown>) => void;
  onClose: () => void;
}

function YuiPlanInlineEditor({ action, fallbackTime, wallets, onChange, onClose }: InlineEditorProps) {
  const t = String(action?.actionType || '');
  const titleKey = getTitleFieldKey(t);
  const titleVal = String(action?.[titleKey] ?? action?.description ?? '');

  const showAmount = ['meal', 'expense', 'income', 'transfer', 'debt_lent', 'debt_borrowed', 'pay_debt', 'purchase_shopping', 'update_transaction'].includes(t);
  const showWallet = WALLET_ACTION_TYPES.has(t) && wallets.length > 0;
  const isTransfer = t === 'transfer';
  const showCategory = CATEGORY_ACTION_TYPES.has(t);
  const showTaskFields = TASK_ACTION_TYPES.has(t);
  const showCalendarFields = CALENDAR_ACTION_TYPES.has(t);
  const showCustomTime = ['meal', 'expense', 'income', 'transfer', 'debt_lent', 'debt_borrowed', 'pay_debt', 'purchase_shopping', 'create_inventory', 'update_inventory', 'record_weight', 'update_transaction'].includes(t);

  return (
    <div className={styles.inlineEditor}>
      <div className={styles.inlineRow2}>
        <div className={styles.inlineField}>
          <label>{titleKey === 'person' ? 'Đối tượng' : titleKey === 'title' ? 'Tiêu đề' : 'Tên / Mô tả'}</label>
          <input
            type="text"
            value={titleVal}
            onChange={(e) => onChange({
              [titleKey]: e.target.value,
              ...(titleKey === 'food_name' ? { description: e.target.value } : {})
            })}
          />
        </div>

        {showAmount && (
          <div className={styles.inlineField}>
            <label>Số tiền (VND)</label>
            <input
              type="number"
              min={0}
              value={action?.amount ?? ''}
              onChange={(e) => onChange({ amount: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
            />
          </div>
        )}

        {t === 'upsert_budget' && (
          <div className={styles.inlineField}>
            <label>Hạn mức (VND)</label>
            <input
              type="number"
              min={0}
              value={action?.limit ?? ''}
              onChange={(e) => onChange({ limit: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
            />
          </div>
        )}

        {t === 'record_weight' && (
          <div className={styles.inlineField}>
            <label>Cân nặng (kg)</label>
            <input
              type="number"
              step="0.1"
              min={1}
              value={action?.weight ?? ''}
              onChange={(e) => onChange({ weight: e.target.value === '' ? 0 : Number(e.target.value) })}
            />
          </div>
        )}

        {['create_shopping_item', 'create_inventory'].includes(t) && (
          <div className={styles.inlineField}>
            <label>Số lượng</label>
            <input
              type="number"
              step="0.1"
              min={0.1}
              value={action?.quantity ?? 1}
              onChange={(e) => onChange({ quantity: Math.max(0.1, Number(e.target.value) || 1) })}
            />
          </div>
        )}
      </div>

      {(showWallet || showCategory || showTaskFields || t === 'meal') && (
        <div className={styles.inlineRow2}>
          {showWallet && (
            <div className={styles.inlineField}>
              <label>{isTransfer ? 'Ví nguồn' : 'Tài khoản / Ví'}</label>
              <select
                value={action?.wallet_id || ''}
                onChange={(e) => {
                  const chosen = wallets.find((w) => w.id === e.target.value);
                  onChange({
                    wallet_id: chosen?.id || undefined,
                    walletName: chosen?.name || undefined
                  });
                }}
              >
                <option value="">-- Chưa chọn ví --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({fmt(w.balance)}đ)
                  </option>
                ))}
              </select>
            </div>
          )}

          {isTransfer && wallets.length > 0 && (
            <div className={styles.inlineField}>
              <label>Ví đích</label>
              <select
                value={action?.to_wallet_id || ''}
                onChange={(e) => {
                  const chosen = wallets.find((w) => w.id === e.target.value);
                  onChange({
                    to_wallet_id: chosen?.id || undefined,
                    toWalletName: chosen?.name || undefined
                  });
                }}
              >
                <option value="">-- Chọn ví đích --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({fmt(w.balance)}đ)
                  </option>
                ))}
              </select>
            </div>
          )}

          {showCategory && (
            <div className={styles.inlineField}>
              <label>Danh mục</label>
              <select
                value={action?.category || 'other'}
                onChange={(e) => onChange({ category: e.target.value })}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>{lbl}</option>
                ))}
              </select>
            </div>
          )}

          {t === 'meal' && (
            <div className={styles.inlineField}>
              <label>Nguồn bữa ăn / Calo</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <select
                  value={action?.source === 'home' ? 'home' : 'eat_out'}
                  onChange={(e) => onChange({ source: e.target.value })}
                >
                  <option value="eat_out">Ăn ngoài</option>
                  <option value="home">Tự nấu</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={action?.calo ?? 0}
                  onChange={(e) => onChange({ calo: Math.max(0, Number(e.target.value) || 0) })}
                  title="Calo (kcal)"
                  style={{ width: '74px' }}
                />
              </div>
            </div>
          )}

          {showTaskFields && (
            <div className={styles.inlineField}>
              <label>Rank Quest</label>
              <select
                value={action?.quest_rank || 'C'}
                onChange={(e) => onChange({ quest_rank: e.target.value })}
              >
                {['S', 'A', 'B', 'C', 'D'].map((r) => (
                  <option key={r} value={r}>Rank {r}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {(showCustomTime || showTaskFields || showCalendarFields) && (
        <div className={styles.inlineRow2}>
          {showCustomTime && (
            <div className={styles.inlineField}>
              <label>Thời gian (giờ VN)</label>
              <input
                type="datetime-local"
                value={toVnDatetimeLocalValue(action?.custom_time, fallbackTime ? new Date(fallbackTime) : new Date())}
                onChange={(e) => {
                  const iso = fromVnDatetimeLocalValue(e.target.value);
                  if (iso) onChange({ custom_time: iso });
                }}
              />
            </div>
          )}

          {showTaskFields && (
            <div className={styles.inlineField}>
              <label>Hạn chót (giờ VN)</label>
              <input
                type="datetime-local"
                value={toVnDatetimeLocalValue(action?.due_date, fallbackTime ? new Date(fallbackTime) : new Date())}
                onChange={(e) => {
                  const iso = fromVnDatetimeLocalValue(e.target.value);
                  if (iso) onChange({ due_date: iso });
                }}
              />
            </div>
          )}

          {showCalendarFields && (
            <>
              <div className={styles.inlineField}>
                <label>Bắt đầu (giờ VN)</label>
                <input
                  type="datetime-local"
                  value={toVnDatetimeLocalValue(action?.start_time, fallbackTime ? new Date(fallbackTime) : new Date())}
                  onChange={(e) => {
                    const iso = fromVnDatetimeLocalValue(e.target.value);
                    if (iso) onChange({ start_time: iso });
                  }}
                />
              </div>
              <div className={styles.inlineField}>
                <label>Kết thúc (giờ VN)</label>
                <input
                  type="datetime-local"
                  value={toVnDatetimeLocalValue(action?.end_time || action?.start_time, fallbackTime ? new Date(fallbackTime) : new Date())}
                  onChange={(e) => {
                    const iso = fromVnDatetimeLocalValue(e.target.value);
                    if (iso) onChange({ end_time: iso });
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.inlineDoneRow}>
        <button type="button" className={styles.inlineDoneBtn} onClick={onClose}>
          <Check size={12} /> Xong chỉnh sửa
        </button>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Tình hình hôm nay của Papa?",
  "Số dư các ví hiện tại?",
  "Tuần này tiêu gì, so với tuần trước?",
  "Hôm nay có quest nào cần làm?",
  "Lịch trình sắp tới có gì?",
  "Thói quen ăn uống 7 ngày qua?",
  "Kho đồ có gì sắp hết hạn?",
  "Danh sách mua sắm còn gì?"
];

export default function YuiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME_MSG]);
  const [userId, setUserId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [editingRow, setEditingRow] = useState<{ msgIdx: number; actionIdx: number } | null>(null);
  const [mobilePanelStyle, setMobilePanelStyle] = useState<React.CSSProperties | undefined>(undefined);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const hydratedUserRef = useRef<string | null>(null);

  const loadBriefing = async () => {
    try {
      const res: any = await getYuiBriefing();
      const data = res?.data;
      if (!data) return;
      if (data.userId) setUserId(data.userId);
      if (Array.isArray(data.wallets)) setWallets(data.wallets);
      if (Array.isArray(data.alerts)) setAlerts(data.alerts);

      // Hydrate lịch sử chat theo đúng tài khoản 1 lần sau khi biết userId
      if (data.userId && hydratedUserRef.current !== data.userId) {
        hydratedUserRef.current = data.userId;
        try {
          const savedRaw = localStorage.getItem(`sao_yui_msgs_${data.userId}`);
          if (savedRaw) {
            const parsed = JSON.parse(savedRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMsgs((prev) => (prev.length <= 1 ? parsed : prev));
            }
          }
        } catch {
          // Bỏ qua lỗi đọc localStorage hỏng
        }
      }
    } catch {
      // Không làm gián đoạn UX chat nếu briefing tải lỗi
    }
  };

  useEffect(() => {
    if (!userId) return;
    try {
      const compact = msgs.slice(-24).map((m) =>
        m.role === 'user'
          ? { role: 'user', text: m.text || (m.imagePreview ? '[Đã gửi 1 hình ảnh]' : '') }
          : m
      );
      localStorage.setItem(`sao_yui_msgs_${userId}`, JSON.stringify(compact));
    } catch {
      // Bỏ qua nếu bộ nhớ đầy
    }
  }, [msgs, userId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open, busy]);

  useEffect(() => {
    if (!open) {
      recognitionRef.current?.stop();
      return;
    }

    if (window.innerWidth > 768) {
      inputRef.current?.focus();
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const syncViewport = () => {
      if (window.innerWidth > 768) {
        setMobilePanelStyle(undefined);
        return;
      }
      const keyboardOpen = vv.height < window.innerHeight - 80;
      if (keyboardOpen) {
        setMobilePanelStyle({
          top: `${Math.max(4, vv.offsetTop + 4)}px`,
          bottom: 'auto',
          height: `${Math.max(240, vv.height - 8)}px`,
          maxHeight: 'none'
        });
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'auto' });
      } else {
        setMobilePanelStyle(undefined);
      }
    };

    vv.addEventListener('resize', syncViewport);
    vv.addEventListener('scroll', syncViewport);
    return () => {
      vv.removeEventListener('resize', syncViewport);
      vv.removeEventListener('scroll', syncViewport);
    };
  }, [open]);

  const attachImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 25 * 1024 * 1024) {
      setMsgs((m) => [...m, { role: 'yui', text: 'Ảnh lớn quá (trên 25MB), Papa chọn ảnh nhỏ hơn giúp Yui nhé!' }]);
      return;
    }
    try {
      const prepared = await compressImageFile(file);
      setPendingImage({ dataUrl: prepared.base64, name: prepared.filename });
    } catch {
      setMsgs((m) => [...m, { role: 'yui', text: 'Ui, Yui không đọc được file ảnh này Papa ạ!' }]);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await attachImageFile(file);
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await attachImageFile(file);
          break;
        }
      }
    }
  };

  const toggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstanceLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstanceLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setMsgs((m) => [
        ...m,
        {
          role: 'yui',
          text: 'Trình duyệt hiện tại chưa hỗ trợ nhập giọng nói trực tiếp. Papa có thể dùng Chrome/Safari mới hoặc gõ/gửi ảnh giúp Yui nha!'
        }
      ]);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'vi-VN';
    rec.interimResults = true;
    rec.continuous = false;

    const baseInput = input.trim();
    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      if (!ev.results) return;
      let spoken = '';
      for (let k = 0; k < ev.results.length; k++) {
        spoken += ev.results[k]?.[0]?.transcript || '';
      }
      const trimmedSpoken = spoken.trim();
      setInput(baseInput ? `${baseInput} ${trimmedSpoken}`.trim() : trimmedSpoken);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const handleClearChat = () => {
    setMsgs([WELCOME_MSG]);
    setEditingRow(null);
    if (userId) {
      try {
        localStorage.removeItem(`sao_yui_msgs_${userId}`);
      } catch {
        // ignore
      }
    }
  };

  const handleSendText = async (textToSend: string, imageToSend?: { dataUrl: string; name: string } | null) => {
    const text = textToSend.trim();
    const attached = imageToSend !== undefined ? imageToSend : pendingImage;
    if ((!text && !attached) || busy) return;

    recognitionRef.current?.stop();
    setListening(false);
    setInput('');
    setPendingImage(null);
    setEditingRow(null);

    // Thu thập 8 tin nhắn gần nhất làm ngữ cảnh hội thoại
    const recentHistory = msgs.slice(-8).map(m => ({
      role: m.role,
      text: m.text
    }));

    setMsgs(m => [
      ...m,
      {
        role: 'user',
        text: text || 'Hãy xem hình ảnh này giúp Papa!',
        ...(attached ? { imagePreview: attached.dataUrl } : {})
      }
    ]);
    setBusy(true);

    try {
      const res: any = await parseYuiMessage(text, recentHistory, attached?.dataUrl);
      const plan = res?.data;

      if (plan && !plan.actions?.length && (plan.reply || plan.summary)) {
        setMsgs(m => [...m, { role: 'yui', text: plan.reply || plan.summary }]);
      } else if (!plan?.actions?.length) {
        setMsgs(m => [
          ...m,
          { role: 'yui', text: 'Hmm, Yui chưa hiểu rõ ý Papa lắm. Papa có thể nói chi tiết hơn giúp Yui được không?' }
        ]);
      } else {
        const replyText = plan.reply || plan.summary || 'Yui đã lên kế hoạch rồi nè, Papa xem qua rồi xác nhận giúp Yui nhé:';
        setMsgs(m => [...m, { role: 'yui', text: replyText, plan, createdAt: formatVnIsoString(new Date()) }]);
      }
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : err?.response?.data?.error || err?.message || 'Mất kết nối máy chủ';
      setMsgs(m => [...m, { role: 'yui', text: `Ui, Yui gặp lỗi rồi Papa ơi: ${errMsg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSendText(input, pendingImage);
  };

  const updatePlanAction = (msgIdx: number, actionIdx: number, patch: Record<string, unknown>) => {
    setMsgs((prev) => {
      const copy = [...prev];
      const target = copy[msgIdx];
      if (!target || target.role !== 'yui' || !target.plan || target.done) return prev;
      const nextActions = [...target.plan.actions];
      if (!nextActions[actionIdx]) return prev;
      nextActions[actionIdx] = { ...nextActions[actionIdx], ...patch };
      copy[msgIdx] = { ...target, plan: { ...target.plan, actions: nextActions } };
      return copy;
    });
  };

  const removePlanAction = (msgIdx: number, actionIdx: number) => {
    setEditingRow((cur) => (cur && cur.msgIdx === msgIdx && cur.actionIdx === actionIdx ? null : cur));
    setMsgs((prev) => {
      const copy = [...prev];
      const target = copy[msgIdx];
      if (!target || target.role !== 'yui' || !target.plan || target.done) return prev;
      const nextActions = target.plan.actions.filter((_: unknown, idx: number) => idx !== actionIdx);
      if (nextActions.length === 0) {
        copy[msgIdx] = { ...target, plan: undefined, text: target.text + '\n\n*(Papa đã huỷ các thao tác này)*' };
      } else {
        copy[msgIdx] = { ...target, plan: { ...target.plan, actions: nextActions } };
      }
      return copy;
    });
  };

  const confirm = async (idx: number) => {
    const msg = msgs[idx];
    if (msg.role !== 'yui' || !msg.plan || msg.done) return;
    setEditingRow(null);
    setBusy(true);

    try {
      const res: any = await executeYuiActions(msg.plan.actions);
      const results: any[] = res?.results ?? [];

      const hpRestored = results.filter(r => r.type === 'meal').reduce((s, r) => s + (r.hp || 0), 0);
      const expGained = results.reduce((s, r) => s + (r.exp || r.rewardExp || 0), 0);
      const weightLogged = results.some(r => r.type === 'record_weight');

      const bonuses: string[] = [];
      if (hpRestored > 0) bonuses.push(`+${hpRestored} HP 💚`);
      if (expGained > 0) bonuses.push(`+${expGained} EXP ⭐`);
      if (weightLogged) bonuses.push(`Đã ghi cân nặng ⚖️`);

      const bonusStr = bonuses.length > 0 ? ` (${bonuses.join(', ')})` : '';

      setMsgs(m => {
        const copy = [...m];
        copy[idx] = { ...msg, done: true };
        return [
          ...copy,
          {
            role: 'yui',
            text: `Xong rồi Papa! Yui đã ghi nhận thành công ${results.length} mục vào hệ thống${bonusStr} ✨`
          }
        ];
      });

      // Bắn event để toàn bộ hệ thống các màn hình cập nhật ngay lập tức & làm mới briefing
      window.dispatchEvent(new CustomEvent('sao-user-updated'));
      window.dispatchEvent(new CustomEvent('sao-tasks-updated'));
      window.dispatchEvent(new CustomEvent('sao-calendar-updated'));
      window.dispatchEvent(new CustomEvent('sao-shopping-updated'));
      window.dispatchEvent(new CustomEvent('sao-finance-updated'));
      window.dispatchEvent(new CustomEvent('sao-health-updated'));
      window.dispatchEvent(new CustomEvent('sao-menu-updated'));
      window.dispatchEvent(new CustomEvent('sao-inventory-updated'));
      void loadBriefing();

    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : err?.response?.data?.error || err?.message || 'Lỗi khi lưu';
      setMsgs(m => [...m, { role: 'yui', text: `Ui, thao tác thất bại: ${errMsg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const cancel = (idx: number) => {
    setEditingRow((cur) => (cur && cur.msgIdx === idx ? null : cur));
    setMsgs(m => {
      const copy = [...m];
      const msg = copy[idx];
      if (msg.role === 'yui') {
        copy[idx] = { ...msg, plan: undefined, text: msg.text + '\n\n*(Papa đã huỷ thao tác này)*' };
      }
      return copy;
    });
  };

  const renderActionBadge = (a: any) => {
    switch (a?.actionType) {
      case 'meal':
        return <span className={`${styles.badge} ${styles.badgeMeal}`}>{a.source === 'home' ? 'Tự nấu' : 'Bữa ăn'}</span>;
      case 'expense':
        return <span className={`${styles.badge} ${styles.badgeExpense}`}>Chi tiêu</span>;
      case 'income':
        return <span className={`${styles.badge} ${styles.badgeIncome}`}>Thu nhập</span>;
      case 'transfer':
        return <span className={`${styles.badge} ${styles.badgeTransfer}`}>Chuyển ví</span>;
      case 'debt_lent':
        return <span className={`${styles.badge} ${styles.badgeDebt}`}>Cho vay</span>;
      case 'debt_borrowed':
        return <span className={`${styles.badge} ${styles.badgeDebt}`}>Đi vay</span>;
      case 'pay_debt':
        return <span className={`${styles.badge} ${a.debt_type === 'lent' ? styles.badgeIncome : styles.badgeDebt}`}>{a.debt_type === 'lent' ? 'Thu nợ' : 'Trả nợ'}</span>;
      case 'upsert_budget':
        return <span className={`${styles.badge} ${styles.badgeBudget}`}>Hạn mức</span>;
      case 'update_transaction':
        return <span className={`${styles.badge} ${styles.badgeEdit}`}>Sửa GD</span>;
      case 'delete_transaction':
        return <span className={`${styles.badge} ${styles.badgeDanger}`}>Xóa GD</span>;
      case 'create_task':
        return <span className={`${styles.badge} ${styles.badgeTask}`}>Quest Mới</span>;
      case 'complete_task':
        return <span className={`${styles.badge} ${styles.badgeTask}`}>Xong Quest</span>;
      case 'update_task':
        return <span className={`${styles.badge} ${styles.badgeEdit}`}>Sửa Quest</span>;
      case 'delete_task':
        return <span className={`${styles.badge} ${styles.badgeDanger}`}>Xóa Quest</span>;
      case 'create_calendar_event':
        return <span className={`${styles.badge} ${styles.badgeCalendar}`}>Lịch trình</span>;
      case 'update_calendar_event':
        return <span className={`${styles.badge} ${styles.badgeEdit}`}>Sửa Lịch</span>;
      case 'delete_calendar_event':
        return <span className={`${styles.badge} ${styles.badgeDanger}`}>Hủy Lịch</span>;
      case 'create_shopping_item':
        return <span className={`${styles.badge} ${styles.badgeShopping}`}>Mua sắm</span>;
      case 'purchase_shopping':
        return <span className={`${styles.badge} ${styles.badgeShopping}`}>{a.add_to_inventory === false ? 'Đã mua' : 'Mua & Kho'}</span>;
      case 'create_inventory':
        return <span className={`${styles.badge} ${styles.badgeInventory}`}>Kho đồ</span>;
      case 'update_inventory':
        return <span className={`${styles.badge} ${a.operation === 'discard' ? styles.badgeDanger : styles.badgeInventory}`}>Sửa Kho</span>;
      case 'record_weight':
        return <span className={`${styles.badge} ${styles.badgeHealth}`}>Cân nặng</span>;
      case 'create_recipe':
        return <span className={`${styles.badge} ${styles.badgeRecipe}`}>Công thức</span>;
      default:
        return <span className={styles.badge}>Hành động</span>;
    }
  };

  const iconFor = (t: string) => {
    switch (t) {
      case 'meal':
        return <Utensils size={15} color="#ffaa00" />;
      case 'expense':
        return <ArrowDownRight size={15} color="#ff4444" />;
      case 'income':
        return <ArrowUpRight size={15} color="#00ffaa" />;
      case 'transfer':
        return <ArrowRightLeft size={15} color="#00f0ff" />;
      case 'debt_lent':
      case 'debt_borrowed':
        return <Users size={15} color="#c084fc" />;
      case 'pay_debt':
        return <HandCoins size={15} color="#c084fc" />;
      case 'upsert_budget':
        return <CreditCard size={15} color="#38bdf8" />;
      case 'update_transaction':
      case 'update_task':
      case 'update_calendar_event':
        return <Pencil size={15} color="#fbbf24" />;
      case 'delete_transaction':
      case 'delete_task':
        return <Trash2 size={15} color="#ff6666" />;
      case 'delete_calendar_event':
        return <CalendarX2 size={15} color="#ff6666" />;
      case 'create_task':
        return <CheckSquare size={15} color="#38bdf8" />;
      case 'complete_task':
        return <CheckCircle2 size={15} color="#00ffaa" />;
      case 'create_calendar_event':
        return <Calendar size={15} color="#f472b6" />;
      case 'create_shopping_item':
        return <ShoppingCart size={15} color="#4ade80" />;
      case 'purchase_shopping':
        return <ShoppingBag size={15} color="#4ade80" />;
      case 'create_inventory':
      case 'update_inventory':
        return <Package size={15} color="#fb923c" />;
      case 'record_weight':
        return <Scale size={15} color="#10b981" />;
      case 'create_recipe':
        return <ChefHat size={15} color="#00f0ff" />;
      default:
        return <Sparkles size={15} color="#ffb6e6" />;
    }
  };

  const renderActionDesc = (a: any) => {
    switch (a.actionType) {
      case 'meal':
        return `${a.food_name || a.description || 'Món ăn'} · ${a.calo || 0} kcal`;
      case 'expense':
      case 'income':
        return a.description || 'Giao dịch';
      case 'transfer':
        return a.description || (
          a.walletName && (a.toWalletName || a.to_wallet_name)
            ? `Chuyển: ${a.walletName} → ${a.toWalletName || a.to_wallet_name}`
            : 'Chuyển khoản nội bộ'
        );
      case 'debt_lent':
        return `Cho vay / Trả hộ: ${a.person || 'Khác'} - ${a.description || ''}`;
      case 'debt_borrowed':
        return `Đi vay: ${a.person || 'Khác'} - ${a.description || ''}`;
      case 'pay_debt':
        return `${a.debt_type === 'lent' ? 'Thu nợ từ' : 'Trả nợ cho'}: ${a.person || 'Đối tượng'}`;
      case 'upsert_budget':
        return `Ngân sách ${CATEGORY_LABELS[a.category] || a.name || a.category}`;
      case 'update_transaction':
        return `Sửa GD: ${a.description || 'Giao dịch'}`;
      case 'delete_transaction':
        return `Xóa GD: ${a.description || 'Giao dịch'}`;
      case 'create_task':
        return `[Rank ${a.quest_rank || 'C'}] ${a.title || 'Nhiệm vụ mới'}`;
      case 'complete_task':
        return `Hoàn thành: ${a.title || 'Quest'}`;
      case 'update_task': {
        const statusLabel = a.status ? ` → ${TASK_STATUS_LABELS[a.status] || a.status}` : '';
        const rankLabel = a.quest_rank ? ` [Rank ${a.quest_rank}]` : '';
        return `Sửa Quest: ${a.title || a.original_title || 'Quest'}${rankLabel}${statusLabel}`;
      }
      case 'delete_task':
        return `Xóa Quest: ${a.title || 'Quest'}`;
      case 'create_calendar_event':
        return `Sự kiện: ${a.title || 'Lịch hẹn'}`;
      case 'update_calendar_event':
        return `Cập nhật lịch: ${a.title || 'Sự kiện'}${a.scope === 'series' ? ' (cả chuỗi)' : ''}`;
      case 'delete_calendar_event':
        return `${a.scope === 'series' ? 'Dừng chuỗi lịch' : 'Hủy / Nghỉ buổi'}: ${a.title || 'Sự kiện'}`;
      case 'create_shopping_item':
        return `Mua: ${a.name} (${a.quantity || 1} ${a.unit || 'món'})`;
      case 'purchase_shopping':
        return `Đã mua: ${a.name} (${a.quantity || 1} ${a.unit || 'món'})${a.add_to_inventory === false ? '' : ' → Cất kho'}`;
      case 'create_inventory':
        return `Cất kho: ${a.name} (${a.quantity || 1} ${a.unit || 'món'})`;
      case 'update_inventory': {
        if (a.operation === 'discard') return `Dùng hết / Bỏ khỏi kho: ${a.name}`;
        if (a.operation === 'deduct') return `Dùng bớt kho: ${a.name} (-${a.delta_quantity ?? a.quantity ?? 0} ${a.unit || ''})`.trim();
        if (a.operation === 'add') return `Thêm vào kho: ${a.name} (+${a.delta_quantity ?? a.quantity ?? 0} ${a.unit || ''})`.trim();
        return `Cập nhật kho: ${a.name}${a.quantity !== undefined ? ` (${a.quantity} ${a.unit || ''})` : ''}`.trim();
      }
      case 'record_weight':
        return `Cập nhật cân nặng: ${a.weight} kg${a.height ? ` (Chiều cao: ${a.height} cm)` : ''} (+100 EXP)`;
      case 'create_recipe':
        return `Công thức: ${a.name || 'Món mới'} (${(a.ingredients || []).length} nguyên liệu)`;
      default:
        return a.description || 'Hành động';
    }
  };

  const getAmountBadgeProps = (a: any) => {
    if (a?.actionType === 'upsert_budget' && a.limit !== undefined) {
      return { text: `${fmt(a.limit)}đ`, className: styles.planAmtTransfer };
    }
    if (a?.amount === undefined || Number(a.amount) <= 0) return null;

    const val = fmt(a.amount);
    const t = a.actionType;
    if (t === 'income' || t === 'debt_borrowed' || (t === 'pay_debt' && a.debt_type === 'lent')) {
      return { text: `+${val}đ`, className: '' };
    }
    if (t === 'transfer' || t === 'update_transaction' || t === 'delete_transaction') {
      return { text: `${val}đ`, className: styles.planAmtTransfer };
    }
    return { text: `-${val}đ`, className: styles.planAmtExpense };
  };

  return (
    <>
      {!open && (
        <button
          className={styles.fab}
          onClick={() => {
            setOpen(true);
            void loadBriefing();
          }}
          title="Gọi trợ thủ Yui"
          aria-label="Gọi trợ thủ Yui"
        >
          <Sparkles size={26} />
        </button>
      )}

      {open && (
        <div className={styles.panel} style={mobilePanelStyle}>
          {/* HEADER */}
          <div className={styles.head}>
            <div className={styles.avatar}>
              <Sparkles size={18} />
            </div>
            <div>
              <div className={styles.name}>YUI</div>
              <div className={styles.sub}>
                Navigation Pixie · {busy ? 'đang suy nghĩ...' : 'sẵn sàng hỗ trợ Papa'}
              </div>
            </div>
            <div className={styles.headActions}>
              <button
                type="button"
                className={styles.headIconBtn}
                onClick={handleClearChat}
                title="Làm mới hội thoại"
                aria-label="Làm mới hội thoại"
                disabled={busy}
              >
                <Eraser size={16} />
              </button>
              <button
                type="button"
                className={styles.close}
                onClick={() => {
                  setOpen(false);
                  setMobilePanelStyle(undefined);
                }}
                aria-label="Đóng bảng Yui"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* QUICK SUGGESTIONS */}
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                className={styles.chip}
                onClick={() => void handleSendText(s, null)}
                disabled={busy}
              >
                {s}
              </button>
            ))}
          </div>

          {/* PROACTIVE ALERTS BAR */}
          {!alertsDismissed && alerts.length > 0 && (
            <div className={styles.alertStrip}>
              <div className={styles.alertStripHeader}>
                <button
                  type="button"
                  className={styles.alertHeaderBtn}
                  onClick={() => setAlertsExpanded((v) => !v)}
                >
                  <Bell size={13} color="#ffaa00" />
                  <span className={styles.alertHeaderText}>
                    <strong>{alerts.length} nhắc nhở:</strong> {alerts[0].title}
                  </span>
                  {alertsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                  type="button"
                  className={styles.alertDismissBtn}
                  onClick={() => setAlertsDismissed(true)}
                  aria-label="Ẩn nhắc nhở"
                  title="Ẩn nhắc nhở"
                >
                  <X size={13} />
                </button>
              </div>
              {alertsExpanded && (
                <div className={styles.alertList}>
                  {alerts.map((al) => (
                    <button
                      key={al.id}
                      type="button"
                      className={`${styles.alertItem} ${
                        al.severity === 'danger'
                          ? styles.alertDanger
                          : al.severity === 'warning'
                            ? styles.alertWarning
                            : styles.alertInfo
                      }`}
                      onClick={() => {
                        setAlertsExpanded(false);
                        void handleSendText(al.suggestedPrompt, null);
                      }}
                      disabled={busy}
                    >
                      <span className={styles.alertItemTitle}>{al.title}</span>
                      <span className={styles.alertItemDetail}>{al.detail}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CHAT MESSAGES */}
          <div className={styles.list} ref={listRef}>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? styles.userMsg : styles.yuiMsg}>
                {m.role === 'user' && m.imagePreview && (
                  <img src={m.imagePreview} alt="Ảnh đính kèm" className={styles.userImage} />
                )}
                <div className={styles.markdown}>
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>

                {/* CONFIRMATION PLAN CARD */}
                {m.role === 'yui' && m.plan && (
                  <div className={styles.plan}>
                    <div className={styles.confirmNotice}>
                      <AlertTriangle size={14} />
                      Yui cần Papa xác nhận ghi dữ liệu vào hệ thống:
                    </div>

                    {m.plan.actions.map((a: any, j: number) => {
                      const schedule = getYuiActionScheduleDisplay(a, m.createdAt);
                      const amtProps = getAmountBadgeProps(a);
                      const recSummary = formatRecurrenceSummary(a);
                      const hasIngredientsUsed = a.actionType === 'meal' && a.source === 'home' && Array.isArray(a.ingredients_used) && a.ingredients_used.length > 0;
                      const showMetaTags = Boolean(schedule || a.walletName || a.toWalletName || a.to_wallet_name || recSummary || hasIngredientsUsed);
                      const isEditing = !m.done && editingRow?.msgIdx === i && editingRow?.actionIdx === j;
                      return (
                      <div key={j} className={styles.planRow}>
                        <div className={styles.planRowHeader}>
                          <div className={styles.planTypeInfo}>
                            {iconFor(a.actionType)}
                            {renderActionBadge(a)}
                            <span className={styles.planDesc}>
                              {renderActionDesc(a)}
                            </span>
                          </div>
                          <div className={styles.planRowRight}>
                            {amtProps && (
                              <span className={`${styles.planAmt} ${amtProps.className}`}>
                                {amtProps.text}
                              </span>
                            )}
                            {!m.done && (
                              <div className={styles.planRowActions}>
                                <button
                                  type="button"
                                  className={styles.planIconBtn}
                                  onClick={() => setEditingRow(isEditing ? null : { msgIdx: i, actionIdx: j })}
                                  title="Chỉnh nhanh"
                                  aria-label="Chỉnh nhanh"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.planIconBtn} ${styles.planIconBtnDanger}`}
                                  onClick={() => removePlanAction(i, j)}
                                  title="Bỏ mục này"
                                  aria-label="Bỏ mục này"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <YuiPlanInlineEditor
                            action={a}
                            fallbackTime={m.createdAt}
                            wallets={wallets}
                            onChange={(patch) => updatePlanAction(i, j, patch)}
                            onClose={() => setEditingRow(null)}
                          />
                        )}

                        {/* Hiển thị ngày giờ ghi DB, ví nguồn & thông tin liên thông rõ ràng trước khi xác nhận */}
                        {showMetaTags && (
                          <div className={styles.planMetaTags}>
                            {schedule && (
                              <div className={styles.planDateTag}>
                                <CalendarDays size={12} color="#ffb6e6" />
                                <span>{schedule.label}: <strong>{schedule.value}</strong></span>
                              </div>
                            )}
                            {schedule?.expiry && (
                              <div className={styles.planExpiryTag}>
                                <Clock size={12} color="#ffaa00" />
                                <span>HSD: <strong>{schedule.expiry}</strong></span>
                              </div>
                            )}
                            {recSummary && (
                              <div className={styles.planRecurrenceTag}>
                                <Repeat size={12} color="#f472b6" />
                                <span><strong>{recSummary}</strong></span>
                              </div>
                            )}
                            {hasIngredientsUsed && (
                              <div className={styles.planHomeCookTag}>
                                <Package size={12} color="#fbbf24" />
                                <span>
                                  Trừ kho: <strong>{a.ingredients_used.map((ing: any) => `${ing.qty} ${ing.unit || ''} ${ing.name}`.trim()).join(', ')}</strong>
                                </span>
                              </div>
                            )}
                            {(a.walletName || a.toWalletName || a.to_wallet_name) && (
                              <div className={styles.planWalletTag}>
                                <Wallet size={12} color="#00f0ff" />
                                {a.actionType === 'transfer' ? (
                                  <span>Từ <strong>{a.walletName || '?'}</strong> → <strong>{a.toWalletName || a.to_wallet_name || '?'}</strong></span>
                                ) : (
                                  <span>Tài khoản/Ví: <strong>{a.walletName}</strong></span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hiển thị chi tiết định lượng dinh dưỡng chuyên gia */}
                        {a.actionType === 'meal' && a.ai_description && (
                          <div className={styles.planNutritionDetail}>
                            {a.ai_description}
                          </div>
                        )}

                        {/* Hiển thị nguyên liệu và các bước nấu của công thức */}
                        {a.actionType === 'create_recipe' && (
                          <div className={styles.planRecipeBox}>
                            {Array.isArray(a.ingredients) && a.ingredients.length > 0 && (
                              <div className={styles.planRecipeTags}>
                                {a.ingredients.map((ing: string, k: number) => (
                                  <span key={k} className={styles.planRecipeTag}>{ing}</span>
                                ))}
                              </div>
                            )}
                            {a.instructions && (
                              <div className={styles.planInstructions}>
                                <strong>Cách nấu:</strong> {a.instructions}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}

                    {!m.done ? (
                      <div className={styles.planBtns}>
                        <button
                          disabled={busy}
                          onClick={() => cancel(i)}
                          className={styles.btnGhost}
                        >
                          <RotateCcw size={13} /> Huỷ
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => confirm(i)}
                          className={styles.btnOk}
                        >
                          <Check size={14} /> Xác nhận ghi DB
                        </button>
                      </div>
                    ) : (
                      <div className={styles.doneTag}>✓ Đã ghi vào hệ thống</div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className={styles.yuiMsg}>
                <span className={styles.dots}>
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
          </div>

          {/* PENDING IMAGE PREVIEW */}
          {pendingImage && (
            <div className={styles.imagePreviewBar}>
              <img src={pendingImage.dataUrl} alt={pendingImage.name} className={styles.imagePreviewThumb} />
              <div className={styles.imagePreviewMeta}>
                Ảnh đính kèm ({pendingImage.name}) · thêm ghi chú nếu cần rồi bấm Gửi
              </div>
              <button
                type="button"
                className={styles.removePreviewBtn}
                onClick={() => setPendingImage(null)}
                aria-label="Xóa ảnh đính kèm"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* INPUT FORM */}
          <form className={styles.inputRow} onSubmit={send}>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className={styles.iconInputBtn}
              onClick={() => imageInputRef.current?.click()}
              disabled={busy}
              title="Đính kèm / Chụp ảnh (hóa đơn, món ăn, cân nặng)"
              aria-label="Đính kèm ảnh"
            >
              <ImagePlus size={17} />
            </button>
            <button
              type="button"
              className={`${styles.iconInputBtn} ${listening ? styles.micActive : ''}`}
              onClick={toggleVoiceInput}
              disabled={busy}
              title={listening ? 'Dừng ghi âm' : 'Nói tiếng Việt với Yui'}
              aria-label={listening ? 'Dừng ghi âm' : 'Nhập giọng nói'}
            >
              {listening ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder={listening ? 'Đang nghe Papa nói...' : pendingImage ? 'Ghi chú thêm cho ảnh (tùy chọn)...' : 'Nhắn, nói hoặc gửi ảnh cho Yui...'}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || (!input.trim() && !pendingImage)}
              title="Gửi cho Yui"
              aria-label="Gửi cho Yui"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
