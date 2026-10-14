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
  Users,
  Check,
  CheckSquare,
  CheckCircle2,
  Calendar,
  ShoppingCart,
  Package,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { parseYuiMessage, executeYuiActions } from './api';
import styles from './YuiAssistant.module.css';

type Msg =
  | { role: 'user'; text: string }
  | { role: 'yui'; text: string; plan?: any; done?: boolean };

const fmt = (n: number) => (Number(n) || 0).toLocaleString('vi-VN');

const SUGGESTIONS = [
  "Tình hình hôm nay của Papa?",
  "Số dư các ví hiện tại?",
  "Hôm nay có quest nào cần làm?",
  "Lịch trình sắp tới có gì?",
  "Hôm nay đã nạp bao nhiêu calo?",
  "Danh sách mua sắm còn gì?"
];

export default function YuiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'yui',
      text: 'Chào Papa! Yui đây ✨ Yui là trợ lý riêng đồng hành cùng Papa trong thế giới SAO này. Papa có thể hỏi Yui về tài chính, nhiệm vụ, lịch trình, sức khoẻ, hoặc nhờ Yui tạo quest, ghi bữa ăn, lên lịch giúp Papa nha! (Yui sẽ luôn hỏi Papa xác nhận trước khi lưu vào hệ thống ạ).'
    }
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open, busy]);

  const handleSendText = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text }]);
    setBusy(true);

    try {
      const res: any = await parseYuiMessage(text);
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
        setMsgs(m => [...m, { role: 'yui', text: replyText, plan }]);
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
    handleSendText(input);
  };

  const confirm = async (idx: number) => {
    const msg = msgs[idx];
    if (msg.role !== 'yui' || !msg.plan || msg.done) return;
    setBusy(true);

    try {
      const res: any = await executeYuiActions(msg.plan.actions);
      const results: any[] = res?.results ?? [];

      const hpRestored = results.filter(r => r.type === 'meal').reduce((s, r) => s + (r.hp || 0), 0);
      const expGained = results.filter(r => r.type === 'complete_task').reduce((s, r) => s + (r.exp || 0), 0);

      const bonuses: string[] = [];
      if (hpRestored > 0) bonuses.push(`+${hpRestored} HP 💚`);
      if (expGained > 0) bonuses.push(`+${expGained} EXP ⭐`);

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

      // Bắn event để toàn bộ hệ thống các màn hình cập nhật ngay lập tức
      window.dispatchEvent(new CustomEvent('sao-user-updated'));
      window.dispatchEvent(new CustomEvent('sao-tasks-updated'));
      window.dispatchEvent(new CustomEvent('sao-calendar-updated'));
      window.dispatchEvent(new CustomEvent('sao-shopping-updated'));
      window.dispatchEvent(new CustomEvent('sao-finance-updated'));

    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : err?.response?.data?.error || err?.message || 'Lỗi khi lưu';
      setMsgs(m => [...m, { role: 'yui', text: `Ui, thao tác thất bại: ${errMsg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const cancel = (idx: number) => {
    setMsgs(m => {
      const copy = [...m];
      const msg = copy[idx];
      if (msg.role === 'yui') {
        copy[idx] = { ...msg, plan: undefined, text: msg.text + '\n\n*(Papa đã huỷ thao tác này)*' };
      }
      return copy;
    });
  };

  const renderActionBadge = (type: string) => {
    switch (type) {
      case 'meal':
        return <span className={`${styles.badge} ${styles.badgeMeal}`}>Bữa ăn</span>;
      case 'expense':
        return <span className={`${styles.badge} ${styles.badgeExpense}`}>Chi tiêu</span>;
      case 'income':
        return <span className={`${styles.badge} ${styles.badgeIncome}`}>Thu nhập</span>;
      case 'debt_lent':
        return <span className={`${styles.badge} ${styles.badgeDebt}`}>Cho vay</span>;
      case 'debt_borrowed':
        return <span className={`${styles.badge} ${styles.badgeDebt}`}>Đi vay</span>;
      case 'create_task':
        return <span className={`${styles.badge} ${styles.badgeTask}`}>Quest Mới</span>;
      case 'complete_task':
        return <span className={`${styles.badge} ${styles.badgeTask}`}>Xong Quest</span>;
      case 'create_calendar_event':
        return <span className={`${styles.badge} ${styles.badgeCalendar}`}>Lịch trình</span>;
      case 'create_shopping_item':
        return <span className={`${styles.badge} ${styles.badgeShopping}`}>Mua sắm</span>;
      case 'create_inventory':
        return <span className={`${styles.badge} ${styles.badgeInventory}`}>Kho đồ</span>;
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
      case 'debt_lent':
      case 'debt_borrowed':
        return <Users size={15} color="#c084fc" />;
      case 'create_task':
        return <CheckSquare size={15} color="#38bdf8" />;
      case 'complete_task':
        return <CheckCircle2 size={15} color="#00ffaa" />;
      case 'create_calendar_event':
        return <Calendar size={15} color="#f472b6" />;
      case 'create_shopping_item':
        return <ShoppingCart size={15} color="#4ade80" />;
      case 'create_inventory':
        return <Package size={15} color="#fb923c" />;
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
      case 'debt_lent':
        return `Cho vay / Trả hộ: ${a.person || 'Khác'} - ${a.description || ''}`;
      case 'debt_borrowed':
        return `Đi vay: ${a.person || 'Khác'} - ${a.description || ''}`;
      case 'create_task':
        return `[Rank ${a.quest_rank || 'C'}] ${a.title || 'Nhiệm vụ mới'}`;
      case 'complete_task':
        return `Hoàn thành: ${a.title || 'Quest'}`;
      case 'create_calendar_event':
        return `Sự kiện: ${a.title || 'Lịch hẹn'}`;
      case 'create_shopping_item':
        return `Mua: ${a.name} (${a.quantity || 1} ${a.unit || 'món'})`;
      case 'create_inventory':
        return `Cất kho: ${a.name} (${a.quantity || 1} ${a.unit || 'món'})`;
      default:
        return a.description || 'Hành động';
    }
  };

  return (
    <>
      {!open && (
        <button
          className={styles.fab}
          onClick={() => setOpen(true)}
          title="Gọi trợ thủ Yui"
          aria-label="Gọi trợ thủ Yui"
        >
          <Sparkles size={26} />
        </button>
      )}

      {open && (
        <div className={styles.panel}>
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
            <button
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Đóng bảng Yui"
            >
              <X size={18} />
            </button>
          </div>

          {/* QUICK SUGGESTIONS */}
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                className={styles.chip}
                onClick={() => handleSendText(s)}
                disabled={busy}
              >
                {s}
              </button>
            ))}
          </div>

          {/* CHAT MESSAGES */}
          <div className={styles.list} ref={listRef}>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? styles.userMsg : styles.yuiMsg}>
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

                    {m.plan.actions.map((a: any, j: number) => (
                      <div key={j} className={styles.planRow}>
                        {iconFor(a.actionType)}
                        {renderActionBadge(a.actionType)}
                        <span className={styles.planDesc}>
                          {renderActionDesc(a)}
                        </span>
                        {a.amount !== undefined && a.amount > 0 && (
                          <span className={styles.planAmt}>{fmt(a.amount)}đ</span>
                        )}
                      </div>
                    ))}

                    {m.plan.matched_wallet?.name && (
                      <div className={styles.wallet}>
                        Ví sử dụng: <strong>{m.plan.matched_wallet.name}</strong>
                      </div>
                    )}

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

          {/* INPUT FORM */}
          <form className={styles.inputRow} onSubmit={send}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Hỏi Yui bất cứ điều gì hoặc nhờ Yui làm hộ..."
              disabled={busy}
              autoFocus
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              title="Gửi cho Yui"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
