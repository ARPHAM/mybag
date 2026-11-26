"use client";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import SaoButton from '../SaoButton';
import SaoFab from '../SaoFab';
import SaoSearchInput from '../SaoSearchInput';
import SaoSelect from '../SaoSelect';
import SaoDebtCard from './SaoDebtCard';
import styles from '@/app/(main)/finance/finance.module.css';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<DebtFilter>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const sortedDebts = [...debts].sort((a, b) => {
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;
    return 0;
  });

  const filtered = sortedDebts.filter(d => {
    if (filter !== 'all' && d.type !== filter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchPerson = (d.personName || '').toLowerCase().includes(q);
      const matchTotal = d.totalAmount.toString().includes(q);
      const matchRemaining = d.remainingAmount.toString().includes(q);
      const matchDueDate = (d.dueDate || '').toLowerCase().includes(q);
      const matchHistory = d.history?.some(h => (h.note || '').toLowerCase().includes(q) || (h.walletName || '').toLowerCase().includes(q));
      if (!matchPerson && !matchTotal && !matchRemaining && !matchDueDate && !matchHistory) return false;
    }
    return true;
  });

  const typeFilterOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'lent', label: t('finance.lent') },
    { value: 'borrowed', label: t('finance.borrowed') }
  ];

  const statusFilterOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'unpaid', label: t('finance.statusUnpaid') },
    { value: 'partial', label: t('finance.statusPartial') },
    { value: 'paid', label: t('finance.statusPaid') }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className={styles.debtsContainer}>
        {/* Thanh công cụ Tìm kiếm + Bộ lọc phân loại & trạng thái chuẩn HUD */}
        <div className={styles.historyToolbar}>
          <div className={styles.historySearchWrapper}>
            <SaoSearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              placeholder={t('finance.searchDebtsPlaceholder')}
            />
          </div>
          <div className={styles.historyFilterWrapper}>
            <SaoSelect
              value={filter}
              onChange={(val) => setFilter(val as DebtFilter)}
              options={typeFilterOptions}
            />
          </div>
          <div className={styles.historyFilterWrapper}>
            <SaoSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusFilterOptions}
            />
          </div>
        </div>

        {/* Lưới hiển thị các thẻ nợ chuẩn SAO HUD (cân đối 2 cột trên Laptop, 1 cột Mobile) */}
        <div className={styles.debtsGrid}>
          {filtered.map(debt => (
            <SaoDebtCard
              key={debt.id}
              debt={debt}
              formatMoney={formatMoney}
              onEdit={onEdit}
              onDebtAction={onDebtAction}
            />
          ))}
          {filtered.length === 0 && (
            <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
              {t('finance.emptyDebts')}
            </div>
          )}
        </div>
      </div>

      <SaoFab
        title={t('finance.addDebt')}
        onClick={onAdd}
        position="fixed"
      />
    </div>
  );
}
