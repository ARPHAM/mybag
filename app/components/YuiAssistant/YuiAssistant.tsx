"use client";

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Utensils, ArrowDownRight, ArrowUpRight, Users, Check } from 'lucide-react';
import { parseSmartExpense, executeSmartExpense } from '../../(main)/finance/api';
import styles from './YuiAssistant.module.css';

type Msg =
  | { role: 'user'; text: string }
  | { role: 'yui'; text: string; plan?: any; done?: boolean };

const fmt = (n: number) => (Number(n) || 0).toLocaleString('vi-VN');

export default function YuiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'yui', text: 'Chào Papa! Yui đây ✨ Papa cứ kể, ví dụ "vừa ăn phở bò tái 50k trả bằng Momo", Yui sẽ ghi bữa ăn, hồi HP và trừ tiền giúp Papa nha.' }
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const res: any = await parseSmartExpense(text);
      const plan = res?.data;
      if (plan && !plan.actions?.length && (plan.reply || plan.summary)) {
        setMsgs(m => [...m, { role: 'yui', text: plan.reply || plan.summary }]);
      } else if (!plan?.actions?.length) {
        setMsgs(m => [...m, { role: 'yui', text: 'Hmm, Yui chưa hiểu lắm. Papa nói rõ số tiền và món/việc giúp Yui nha?' }]);
      } else {
        setMsgs(m => [...m, { role: 'yui', text: plan.summary || 'Yui hiểu thế này, Papa xác nhận nhé:', plan }]);
      }
    } catch (err: any) {
      setMsgs(m => [...m, { role: 'yui', text: `Ui, Yui gặp lỗi: ${typeof err === 'string' ? err : err?.message || 'mất kết nối'}` }]);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (idx: number) => {
    const msg = msgs[idx];
    if (msg.role !== 'yui' || !msg.plan || msg.done) return;
    setBusy(true);
    try {
      const res: any = await executeSmartExpense(msg.plan.actions);
      const results: any[] = res?.results ?? [];
      const hp = results.filter(r => r.type === 'meal').reduce((s, r) => s + (r.hp || 0), 0);
      setMsgs(m => {
        const copy = [...m];
        copy[idx] = { ...msg, done: true };
        return [...copy, { role: 'yui', text: `Xong rồi Papa! Đã ghi ${results.length} mục${hp ? `, hồi +${hp} HP 💚` : ''}.` }];
      });
      window.dispatchEvent(new CustomEvent('sao-user-updated'));
    } catch (err: any) {
      setMsgs(m => [...m, { role: 'yui', text: `Ghi thất bại: ${typeof err === 'string' ? err : err?.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const cancel = (idx: number) => {
    setMsgs(m => {
      const copy = [...m];
      const msg = copy[idx];
      if (msg.role === 'yui') copy[idx] = { ...msg, plan: undefined, text: msg.text + ' (đã huỷ)' };
      return copy;
    });
  };

  const iconFor = (t: string) =>
    t === 'meal' ? <Utensils size={14} color="#ffaa00" /> :
    t === 'income' || t === 'debt_borrowed' ? <ArrowUpRight size={14} color="#00ffaa" /> :
    t.startsWith('debt') ? <Users size={14} color="#c084fc" /> :
    <ArrowDownRight size={14} color="#ff4444" />;

  return (
    <>
      {!open && (
        <button className={styles.fab} onClick={() => setOpen(true)} title="Gọi Yui">
          <Sparkles size={26} />
        </button>
      )}

      {open && (
        <div className={styles.panel}>
          <div className={styles.head}>
            <div className={styles.avatar}><Sparkles size={16} /></div>
            <div>
              <div className={styles.name}>YUI</div>
              <div className={styles.sub}>Navigation Pixie · {busy ? 'đang suy nghĩ...' : 'online'}</div>
            </div>
            <button className={styles.close} onClick={() => setOpen(false)}><X size={18} /></button>
          </div>

          <div className={styles.list} ref={listRef}>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? styles.userMsg : styles.yuiMsg}>
                <div>{m.text}</div>
                {m.role === 'yui' && m.plan && (
                  <div className={styles.plan}>
                    {m.plan.actions.map((a: any, j: number) => (
                      <div key={j} className={styles.planRow}>
                        {iconFor(a.actionType)}
                        <span className={styles.planDesc}>
                          {a.actionType === 'meal' ? `${a.food_name || a.description} · ${a.calo || 0} kcal` : a.description}
                          {a.person ? ` (${a.person})` : ''}
                        </span>
                        <span className={styles.planAmt}>{fmt(a.amount)}đ</span>
                      </div>
                    ))}
                    {m.plan.matched_wallet?.name && <div className={styles.wallet}>Ví: {m.plan.matched_wallet.name}</div>}
                    {!m.done ? (
                      <div className={styles.planBtns}>
                        <button disabled={busy} onClick={() => cancel(i)} className={styles.btnGhost}>Huỷ</button>
                        <button disabled={busy} onClick={() => confirm(i)} className={styles.btnOk}><Check size={14} /> Ghi luôn</button>
                      </div>
                    ) : <div className={styles.doneTag}>✓ Đã ghi</div>}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className={styles.yuiMsg}><span className={styles.dots}><i /><i /><i /></span></div>}
          </div>

          <form className={styles.inputRow} onSubmit={send}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Kể cho Yui nghe..."
              disabled={busy}
              autoFocus
            />
            <button type="submit" disabled={busy || !input.trim()}><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  );
}
