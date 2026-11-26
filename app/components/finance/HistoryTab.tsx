"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Plus, ArrowDown, ArrowUp, ArrowRightLeft, CalendarDays, RotateCcw, Loader2
} from 'lucide-react';
import SaoButton from '../SaoButton';
import SaoFab from '../SaoFab';
import SaoSearchInput from '../SaoSearchInput';
import SaoSelect from '../SaoSelect';
import SaoDatePicker from '../SaoDatePicker';
import SaoTransactionItem from '../SaoTransactionItem';
import styles from '@/app/(main)/finance/finance.module.css';
import type { Transaction } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { getVnDateStr } from '@/lib/vnTime';
import { getTransactions } from '@/app/(main)/finance/api';

interface Props {
  transactions?: Transaction[];
  formatMoney: (n: number) => string;
  onAdd: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  refreshTrigger?: number;
}

type Filter = 'all' | 'income' | 'expense' | 'transfer';

const getRecent14DaysRange = () => {
  const now = new Date();
  const end = getVnDateStr(now);
  const past = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  const start = getVnDateStr(past);
  return { start, end };
};

export default function HistoryTab({
  transactions: initialTransactions,
  formatMoney,
  onAdd,
  onEdit,
  onDelete,
  refreshTrigger
}: Props) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Mặc định lọc trong 14 ngày gần nhất để tối ưu hiệu năng
  const defaultRange = useMemo(() => getRecent14DaysRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const [items, setItems] = useState<Transaction[]>(initialTransactions || []);
  const [loading, setLoading] = useState(false);
  const hasMounted = useRef(false);

  // Debounce tìm kiếm 350ms để tối ưu tải server
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const isDefault14Days = startDate === defaultRange.start && endDate === defaultRange.end;

  const handleReset14Days = () => {
    setStartDate(defaultRange.start);
    setEndDate(defaultRange.end);
  };

  // Truy vấn Server-side theo các bộ lọc
  const fetchServerHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res: any = await getTransactions({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: filter !== 'all' ? filter : undefined,
        search: debouncedSearch.trim() || undefined,
        force: true
      });
      if (res && Array.isArray(res)) {
        setItems(res.map((t: any) => ({
          id: t._id || t.id,
          type: t.type,
          amount: t.amount,
          date: getVnDateStr(t.date),
          description: t.description,
          walletName: t.walletName,
          wallet_id: t.wallet_id,
          to_wallet_id: t.to_wallet_id,
          to_walletName: t.to_walletName,
          category: t.category
        })));
      }
    } catch (err) {
      console.error('Failed to fetch transactions from server:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filter, debouncedSearch]);

  // Gọi API mỗi khi thay đổi ngày, loại giao dịch, từ khóa tìm kiếm hoặc khi refreshTrigger nhảy
  useEffect(() => {
    fetchServerHistory(!hasMounted.current && !!initialTransactions && initialTransactions.length > 0);
    hasMounted.current = true;
  }, [fetchServerHistory, refreshTrigger]);

  // Lắng nghe sự kiện cập nhật tài chính toàn cục
  useEffect(() => {
    const handleUpdated = () => fetchServerHistory(true);
    window.addEventListener('sao-finance-updated', handleUpdated);
    return () => window.removeEventListener('sao-finance-updated', handleUpdated);
  }, [fetchServerHistory]);

  const grouped = items.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Sắp xếp ngày giảm dần (mới nhất lên đầu)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const filterOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'income', label: t('finance.income') },
    { value: 'expense', label: t('finance.expense') },
    { value: 'transfer', label: t('finance.transfer') }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className={styles.historyContainer}>
        {/* Thanh công cụ tìm kiếm, phân loại và khoảng ngày (Server-side Filter) */}
        <div className={styles.historyToolbar}>
          <div className={styles.historySearchWrapper}>
            <SaoSearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              placeholder={t('common.searchPlaceholder')}
            />
          </div>
          <div className={styles.historyFilterWrapper}>
            <SaoSelect
              value={filter}
              onChange={(val) => setFilter(val as Filter)}
              options={filterOptions}
            />
          </div>
          <div className={styles.historyDateWrapper}>
            <div className={styles.historyDatePickerItem}>
              <SaoDatePicker
                value={startDate}
                onChange={setStartDate}
                onClear={() => setStartDate('')}
                clearable
                placeholder={t('common.fromDate')}
              />
            </div>
            <span className={styles.historyDateSeparator}>—</span>
            <div className={styles.historyDatePickerItem}>
              <SaoDatePicker
                value={endDate}
                onChange={setEndDate}
                onClear={() => setEndDate('')}
                clearable
                placeholder={t('common.toDate')}
              />
            </div>
            {!isDefault14Days && (
              <button
                type="button"
                className={styles.historyResetBtn}
                onClick={handleReset14Days}
                title={t('common.last14Days')}
              >
                <RotateCcw size={13} />
                <span>14d</span>
              </button>
            )}
          </div>
        </div>

        {/* Danh sách giao dịch gom nhóm theo ngày */}
        <div className={styles.historyList} style={{ opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s ease' }}>
          {loading && items.length === 0 ? (
            <div className={styles.emptyState} style={{ marginTop: 20 }}>
              <Loader2 size={24} className="animate-spin" color="var(--sao-primary-hex, #00f0ff)" />
              <span>{t('common.loading')}</span>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date}>
                <div className={styles.historyDateGroup}>
                  <CalendarDays size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                  {t('common.date')} {date}
                </div>
                <div className={styles.historyGroupList}>
                  {grouped[date].map(tx => (
                    <SaoTransactionItem
                      key={tx.id}
                      title={tx.description || (tx.type === 'income' ? t('finance.income') : tx.type === 'expense' ? t('finance.expense') : t('finance.transfer'))}
                      amount={tx.amount}
                      currency={t('common.currency')}
                      type={tx.type}
                      walletName={tx.type === 'transfer' && tx.to_walletName ? `${tx.walletName} → ${tx.to_walletName}` : tx.walletName}
                      formatMoney={formatMoney}
                      icon={
                        tx.type === 'income' ? <ArrowDown size={15} /> :
                          tx.type === 'expense' ? <ArrowUp size={15} /> :
                            <ArrowRightLeft size={15} />
                      }
                      onClick={() => onEdit(tx)}
                      onEdit={() => onEdit(tx)}
                      onDelete={() => onDelete(tx.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {!loading && items.length === 0 && (
            <div className={styles.emptyState} style={{ marginTop: 20 }}>
              {t('finance.noMatchingTx')}
            </div>
          )}
        </div>
      </div>

      <SaoFab
        title={t('finance.addTransaction')}
        onClick={onAdd}
        position="fixed"
      />
    </div>
  );
}