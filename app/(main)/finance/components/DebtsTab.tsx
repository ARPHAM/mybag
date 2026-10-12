"use client";

import { useState } from 'react';
import {
  Plus, Edit3, User, Calendar, Clock,
  CheckCircle2, Wallet
} from 'lucide-react';
import SaoButton from '../../../components/SaoButton/SaoButton';
import styles from '../finance.module.css';
import type { DebtItem } from '@/lib/types';

interface Props {
  debts: DebtItem[];
  formatMoney: (n: number) => string;
  onAdd: () => void;
  onEdit: (d: DebtItem) => void;
  onDebtAction: (d: DebtItem, action: 'borrow_more' | 'pay_back') => void;
}

type DebtFilter = 'all' | 'lent' | 'borrowed';

export default function DebtsTab({ debts, formatMoney, onAdd, onEdit, onDebtAction }: Props) {
  const [filter, setFilter] = useState<DebtFilter>('all');

  const sortedDebts = [...debts].sort((a, b) => {
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;
    return 0;
  });
  const filtered = sortedDebts.filter(d => filter === 'all' || d.type === filter);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className={styles.historyFilterBar}>
        {(['all', 'lent', 'borrowed'] as DebtFilter[]).map(f => (
          <SaoButton
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tất cả' : f === 'lent' ? 'Cho vay' : 'Đi vay'}
          </SaoButton>
        ))}
      </div>

      <div className={styles.debtsGrid}>
        {filtered.map(debt => {
          const percentPaid = Math.min(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100, 100);
          return (
            <div key={debt.id} className={`${styles.debtCard} ${styles[debt.type]} ${debt.status === 'paid' ? styles.paid : ''}`}>
              {debt.status === 'paid' && <div className={styles.debtCleared}>CLEARED</div>}

              <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); onEdit(debt); }}>
                <Edit3 size={16} />
              </SaoButton>

              <div className={styles.debtTop}>
                <div className={styles.debtPerson}>
                  <div className={styles.debtAvatar}>
                    <User size={20} color={debt.type === 'lent' ? '#00ffaa' : '#ffaa00'} />
                  </div>
                  <div>
                    <div className={styles.debtName}>{debt.personName}</div>
                    <div className={styles.debtTypeLabel}>
                      {debt.type === 'lent' ? 'Cho vay' : 'Đi vay'}
                    </div>
                  </div>
                </div>
                <div className={`${styles.debtBadge} ${styles[debt.status]}`}>
                  {debt.status === 'unpaid' ? 'Chưa trả' : debt.status === 'partial' ? 'Đã trả 1 phần' : 'Đã thanh toán'}
                </div>
              </div>

              <div className={styles.debtAmountSection} style={{ paddingBottom: '10px', borderBottom: debt.history && debt.history.length > 0 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#a0c4ff', marginBottom: '8px' }}>
                  <span>Đã trả: {formatMoney(debt.totalAmount - debt.remainingAmount)}</span>
                  <span>Tổng: {formatMoney(debt.totalAmount)}</span>
                </div>
                <div className={styles.debtProgressBg}>
                  <div className={styles.debtProgressFill} style={{ width: `${percentPaid}%` }} />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', textAlign: 'right', marginTop: '8px' }}>
                  Còn lại: <span style={{ color: debt.type === 'lent' ? '#00ffaa' : '#ffaa00' }}>{formatMoney(debt.remainingAmount)}</span> <small style={{ fontWeight: 'normal', fontSize: '1rem' }}>VND</small>
                </div>

                {debt.status !== 'paid' ? (
                  <div className={styles.debtDueDate} style={{ marginTop: '10px' }}>
                    <Calendar size={14} /> Hạn chót: {debt.dueDate}
                  </div>
                ) : (
                  <div className={styles.debtDueDate} style={{ color: '#00ffaa', marginTop: '10px' }}>
                    <CheckCircle2 size={14} /> Hoàn tất: {debt.completedDate}
                  </div>
                )}
              </div>

              {debt.history && debt.history.length > 0 && (
                <details className={styles.debtHistoryDetails}>
                  <summary><Clock size={14} /> Lịch sử giao dịch</summary>
                  <div className={styles.debtHistoryList}>
                    {debt.history.map(h => (
                      <div key={h.id} className={styles.debtHistoryRecord}>
                        <span>{h.date} - <Wallet size={10} style={{ display: 'inline', marginRight: 4 }} /> {h.walletName}</span>
                        <span style={{ color: h.type === 'pay_back' ? '#00ffaa' : '#ffaa00' }}>
                          {h.type === 'pay_back' ? 'Trả vào' : 'Vay thêm'}: {formatMoney(h.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {debt.status !== 'paid' && (
                <div className={styles.debtActionBtns}>
                  <SaoButton variant="primary" onClick={() => onDebtAction(debt, 'pay_back')}>
                    <CheckCircle2 size={16} /> {debt.type === 'lent' ? 'Thu Nợ' : 'Trả Nợ'}
                  </SaoButton>
                  <SaoButton variant="primary" onClick={() => onDebtAction(debt, 'borrow_more')}>
                    <Plus size={16} /> {debt.type === 'lent' ? 'Cho Vay Thêm' : 'Vay Thêm'}
                  </SaoButton>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
            Không có khoản nợ nào.
          </div>
        )}
      </div>

      <SaoButton
        variant="primary"
        style={{ borderRadius: '50%', width: 50, height: 50, position: 'absolute', bottom: 30, right: 30, zIndex: 100, boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)' }}
        title="Thêm khoản nợ mới"
        onClick={onAdd}
      >
        <Plus size={32} />
      </SaoButton>
    </div>
  );
}
