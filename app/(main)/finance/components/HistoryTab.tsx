"use client";

import { useState } from 'react';
import {
  Plus, Edit3, Trash2, ArrowDown, ArrowUp, ArrowRightLeft,
  Wallet, CalendarDays
} from 'lucide-react';
import SaoButton from '../../../components/SaoButton/SaoButton';
import styles from '../finance.module.css';
import type { Transaction } from '@/lib/types';

interface Props {
  transactions: Transaction[];
  formatMoney: (n: number) => string;
  onAdd: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

type Filter = 'all' | 'income' | 'expense' | 'transfer';

export default function HistoryTab({ transactions, formatMoney, onAdd, onEdit, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = transactions.filter(tx => filter === 'all' || tx.type === filter);

  const grouped = filtered.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className={styles.historyFilterBar}>
        {(['all', 'income', 'expense', 'transfer'] as Filter[]).map(f => (
          <SaoButton
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tất cả' : f === 'income' ? 'Thu nhập' : f === 'expense' ? 'Chi tiêu' : 'Chuyển khoản'}
          </SaoButton>
        ))}
      </div>

      <div className={styles.historyList}>
        {Object.keys(grouped).map(date => (
          <div key={date}>
            <div className={styles.historyDateGroup}>
              <CalendarDays size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              Ngày {date}
            </div>
            <div className={styles.historyList}>
              {grouped[date].map(tx => (
                <div key={tx.id} className={styles.historyItem}>
                  <div className={styles.historyItemLeft}>
                    <div className={`${styles.historyIcon} ${styles[tx.type]}`}>
                      {tx.type === 'income' && <ArrowDown size={20} />}
                      {tx.type === 'expense' && <ArrowUp size={20} />}
                      {tx.type === 'transfer' && <ArrowRightLeft size={20} />}
                    </div>
                    <div className={styles.historyDetails}>
                      <div className={styles.historyTitle}>
                        {tx.description}
                        <SaoButton variant="ghost" style={{ marginLeft: 8, padding: 4 }} onClick={() => onEdit(tx)}>
                          <Edit3 size={14} />
                        </SaoButton>
                        <SaoButton variant="ghost" ghostType="danger" style={{ marginLeft: 8, padding: 4 }} onClick={() => onDelete(tx.id)}>
                          <Trash2 size={14} />
                        </SaoButton>
                      </div>
                      <div className={styles.historyMeta}>
                        <span><Wallet size={12} /> {tx.walletName}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles.historyAmount} ${styles[tx.type]}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatMoney(tx.amount)} <small>VND</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={styles.emptyState} style={{ marginTop: 20 }}>
            Không có giao dịch nào phù hợp.
          </div>
        )}
      </div>

      <SaoButton
        variant="primary"
        style={{ borderRadius: '50%', width: 50, height: 50, position: 'absolute', bottom: 30, right: 30, zIndex: 100, boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)' }}
        title="Ghi chép giao dịch"
        onClick={onAdd}
      >
        <Plus size={32} />
      </SaoButton>
    </div>
  );
}
