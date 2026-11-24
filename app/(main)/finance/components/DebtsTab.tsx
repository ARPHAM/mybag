"use client";

import { useState } from 'react';
import {
  Plus, Edit3, User, Calendar, Clock,
  CheckCircle2, Wallet
} from 'lucide-react';
import SaoButton from '../../../components/SaoButton/SaoButton';
import styles from '../finance.module.css';
import type { DebtItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  debts: DebtItem[];
  formatMoney: (n: number) => string;
  onAdd: () => void;
  onEdit: (d: DebtItem) => void;
  onDebtAction: (d: DebtItem, action: 'borrow_more' | 'pay_back') => void;
}

type DebtFilter = 'all' | 'lent' | 'borrowed';

export default function DebtsTab({ debts, formatMoney, onAdd, onEdit, onDebtAction }: Props) {
  const { t } = useI18n();
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
            {f === 'all' ? t('common.all') : f === 'lent' ? t('finance.lent') : t('finance.borrowed')}
          </SaoButton>
        ))}
      </div>

      <div className={styles.debtsGrid}>
        {filtered.map(debt => {
          const percentPaid = Math.min(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100, 100);
          return (
            <div key={debt.id} className={`${styles.debtCard} ${styles[debt.type]} ${debt.status === 'paid' ? styles.paid : ''}`}>
              {debt.status === 'paid' && <div className={styles.debtCleared}>{t('finance.cleared')}</div>}

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
                      {debt.type === 'lent' ? t('finance.lent') : t('finance.borrowed')}
                    </div>
                  </div>
                </div>
                <div className={`${styles.debtBadge} ${styles[debt.status]}`}>
                  {debt.status === 'unpaid' ? t('finance.statusUnpaid') : debt.status === 'partial' ? t('finance.statusPartial') : t('finance.statusPaid')}
                </div>
              </div>

              <div className={styles.debtAmountSection} style={{ paddingBottom: '10px', borderBottom: debt.history && debt.history.length > 0 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#a0c4ff', marginBottom: '8px' }}>
                  <span>{t('finance.paidAmount')}: {formatMoney(debt.totalAmount - debt.remainingAmount)}</span>
                  <span>{t('finance.total')}: {formatMoney(debt.totalAmount)}</span>
                </div>
                <div className={styles.debtProgressBg}>
                  <div className={styles.debtProgressFill} style={{ width: `${percentPaid}%` }} />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', textAlign: 'right', marginTop: '8px' }}>
                  {t('finance.remaining')}: <span style={{ color: debt.type === 'lent' ? '#00ffaa' : '#ffaa00' }}>{formatMoney(debt.remainingAmount)}</span> <small style={{ fontWeight: 'normal', fontSize: '1rem' }}>{t('common.currency')}</small>
                </div>

                {debt.status !== 'paid' ? (
                  <div className={styles.debtDueDate} style={{ marginTop: '10px' }}>
                    <Calendar size={14} /> {t('finance.dueDate')}: {debt.dueDate}
                  </div>
                ) : (
                  <div className={styles.debtDueDate} style={{ color: '#00ffaa', marginTop: '10px' }}>
                    <CheckCircle2 size={14} /> {t('finance.completedDate')}: {debt.completedDate}
                  </div>
                )}
              </div>

              {debt.history && debt.history.length > 0 && (
                <details className={styles.debtHistoryDetails}>
                  <summary><Clock size={14} /> {t('finance.debtHistory')}</summary>
                  <div className={styles.debtHistoryList}>
                    {debt.history.map(h => (
                      <div key={h.id} className={styles.debtHistoryRecord}>
                        <span>{h.date} - <Wallet size={10} style={{ display: 'inline', marginRight: 4 }} /> {h.walletName}</span>
                        <span style={{ color: h.type === 'pay_back' ? '#00ffaa' : '#ffaa00' }}>
                          {h.type === 'pay_back' ? t('finance.payBack') : t('finance.borrowMore')}: {formatMoney(h.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {debt.status !== 'paid' && (
                <div className={styles.debtActionBtns}>
                  <SaoButton variant="primary" onClick={() => onDebtAction(debt, 'pay_back')}>
                    <CheckCircle2 size={16} /> {debt.type === 'lent' ? t('finance.collectDebt') : t('finance.payDebt')}
                  </SaoButton>
                  <SaoButton variant="primary" onClick={() => onDebtAction(debt, 'borrow_more')}>
                    <Plus size={16} /> {debt.type === 'lent' ? t('finance.lendMore') : t('finance.borrowMore')}
                  </SaoButton>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
            {t('finance.emptyDebts')}
          </div>
        )}
      </div>

      <SaoButton
        variant="primary"
        className={styles.overviewFab}
        title={t('finance.addDebt')}
        onClick={onAdd}
      >
        <Plus size={28} />
      </SaoButton>
    </div>
  );
}
