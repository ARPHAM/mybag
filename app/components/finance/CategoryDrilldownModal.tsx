"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  ArrowUpDown,
  Sparkles,
  Loader2,
  PieChart
} from 'lucide-react';
import SaoModal from '../SaoModal';
import SaoStatCard from '../SaoStatCard';
import SaoTransactionItem from '../SaoTransactionItem';
import SaoSearchInput from '../SaoSearchInput';
import SaoSelect from '../SaoSelect';
import { getCategoryTransactions } from '@/app/(main)/finance/api';
import type { Transaction } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import styles from './CategoryDrilldownModal.module.css';

interface CategoryDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryKey: string;
  categoryName: string;
  categoryColor: string;
  period: '30days' | '6months';
  startDate: string;
  endDate: string;
  formatMoney: (n: number) => string;
  fallbackTransactions?: Transaction[];
}

export default function CategoryDrilldownModal({
  isOpen,
  onClose,
  categoryKey,
  categoryName,
  categoryColor,
  period,
  startDate,
  endDate,
  formatMoney,
  fallbackTransactions = []
}: CategoryDrilldownModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount_desc' | 'date_desc' | 'date_asc'>('amount_desc');

  const cacheRef = useRef<Record<string, Transaction[]>>({});

  useEffect(() => {
    if (!isOpen || !categoryKey) return;

    setSearchTerm('');
    setSelectedWallet('all');
    setSortBy('amount_desc');

    const cacheKey = `${categoryKey}_${startDate}_${endDate}`;
    if (cacheRef.current[cacheKey]) {
      setTransactions(cacheRef.current[cacheKey]);
      setLoading(false);
      return;
    }

    const localFiltered = fallbackTransactions.filter((tx) => {
      if (tx.type !== 'expense') return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      if (categoryKey === 'other') {
        return !tx.category || tx.category === 'other';
      }
      return tx.category?.toLowerCase() === categoryKey.toLowerCase();
    });

    if (localFiltered.length > 0) {
      setTransactions(localFiltered);
    }

    setLoading(true);
    getCategoryTransactions({
      category: categoryKey,
      startDate,
      endDate,
      type: 'expense'
    })
      .then((res: any) => {
        const data = res?.data;
        if (Array.isArray(data)) {
          const mapped: Transaction[] = data.map((t: any) => ({
            id: t._id,
            type: t.type,
            amount: t.amount,
            date: typeof t.date === 'string' ? t.date.split('T')[0] : new Date(t.date).toISOString().split('T')[0],
            description: t.description,
            walletName: t.walletName,
            wallet_id: t.wallet_id,
            to_wallet_id: t.to_wallet_id,
            category: t.category
          }));
          cacheRef.current[cacheKey] = mapped;
          setTransactions(mapped);
        }
      })
      .catch((err) => {
        console.warn('Failed to load on-demand category transactions, using fallback:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, categoryKey, startDate, endDate]);

  const walletOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.walletName) set.add(tx.walletName);
    });
    return Array.from(set);
  }, [transactions]);

  const walletSelectOptions = useMemo(() => [
    { value: 'all', label: t('finance.allWallets') },
    ...walletOptions.map((w) => ({ value: w, label: w }))
  ], [walletOptions, t]);

  const sortSelectOptions = useMemo(() => [
    { value: 'amount_desc', label: t('finance.sortAmountDesc') },
    { value: 'date_desc', label: t('finance.sortDateDesc') },
    { value: 'date_asc', label: t('finance.sortDateAsc') }
  ], [t]);

  const stats = useMemo(() => {
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const count = transactions.length;
    const avgAmount = count > 0 ? Math.round(totalAmount / count) : 0;
    const maxTx = transactions.reduce<Transaction | null>((max, tx) => {
      if (!max || tx.amount > max.amount) return tx;
      return max;
    }, null);

    return { totalAmount, count, avgAmount, maxTx };
  }, [transactions]);

  const topExpenses = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
    return sorted.slice(0, 3);
  }, [transactions]);
  const displayItems = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (selectedWallet !== 'all' && tx.walletName !== selectedWallet) {
          return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchDesc = tx.description?.toLowerCase().includes(q);
          const matchWallet = tx.walletName?.toLowerCase().includes(q);
          return matchDesc || matchWallet;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'date_desc') return b.date.localeCompare(a.date);
        if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
        return 0;
      });
  }, [transactions, searchTerm, selectedWallet, sortBy]);

  return (
    <SaoModal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryName}
      icon={<PieChart size={20} color={categoryColor} />}
      size="lg"
    >
      <div className={styles.modalContainer}>
        <div className={styles.periodBanner}>
          <div className={styles.periodTextGroup}>
            <Calendar size={13} className={styles.calendarIcon} />
            <span className={styles.periodLabel}>
              {period === '30days' ? t('finance.past30Days') : t('finance.past6Months')}
            </span>
            <span className={styles.periodDivider}>•</span>
            <span className={styles.dateRangeText}>{startDate} → {endDate}</span>
          </div>
        </div>
        <div className={styles.kpiGrid}>
          <SaoStatCard
            label={t('finance.totalExpenseShort')}
            value={formatMoney(stats.totalAmount)}
            unit={t('common.vnd')}
            variant="red"
            icon={<DollarSign size={12} />}
          />
          <SaoStatCard
            label={t('finance.transactionCountShort')}
            value={stats.count}
            unit={t('finance.itemsOf')}
            variant="cyan"
            icon={<Receipt size={12} />}
          />
          <SaoStatCard
            label={t('finance.avgPerTxShort')}
            value={formatMoney(stats.avgAmount)}
            unit={t('common.vnd')}
            variant="cyan"
            icon={<ArrowUpDown size={12} />}
          />
          <SaoStatCard
            label={t('finance.largestTxShort')}
            value={stats.maxTx ? formatMoney(stats.maxTx.amount) : '0'}
            unit={t('common.vnd')}
            variant="gold"
            icon={<TrendingUp size={12} />}
          />
        </div>

        {topExpenses.length > 0 && stats.totalAmount > 0 && (
          <div className={styles.topBox}>
            <div className={styles.topBoxBevelTL} />
            <div className={styles.topBoxBevelBR} />

            <div className={styles.topBoxHeader}>
              <div className={styles.topBoxTitle}>
                <Sparkles size={14} className={styles.topBoxIcon} />
                <span>{t('finance.topExpenseTitle')}</span>
              </div>
              <span className={styles.topBoxCount}>Top {topExpenses.length}</span>
            </div>

            <div className={styles.topList}>
              {topExpenses.map((item, idx) => {
                const percent = Math.round((item.amount / stats.totalAmount) * 100);
                return (
                  <SaoTransactionItem
                    key={item.id}
                    title={item.description || t('finance.noDescription')}
                    date={item.date}
                    amount={item.amount}
                    currency={t('common.vnd')}
                    type="expense"
                    walletName={item.walletName}
                    rank={idx + 1}
                    percentage={percent}
                    formatMoney={formatMoney}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.filterRow}>
          <SaoSearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('finance.searchTxPlaceholder')}
            onClear={() => setSearchTerm('')}
          />

          {walletOptions.length > 1 && (
            <SaoSelect
              value={selectedWallet}
              onChange={(val) => setSelectedWallet(val)}
              options={walletSelectOptions}
            />
          )}

          <SaoSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={sortSelectOptions}
          />
        </div>

        {/* Danh sách giao dịch chi tiết */}
        {loading && transactions.length === 0 ? (
          <div className={styles.stateBox}>
            <Loader2 size={24} className="animate-spin" color="var(--sao-primary-hex, #00f0ff)" />
            <span>{t('finance.drilldownLoading')}</span>
          </div>
        ) : displayItems.length === 0 ? (
          <div className={styles.stateBox}>
            <span>
              {searchTerm ? t('finance.noMatchingTx') : t('finance.noCategoryTx')}
            </span>
          </div>
        ) : (
          <div className={styles.listContainer}>
            {displayItems.map((tx) => (
              <SaoTransactionItem
                key={tx.id}
                title={tx.description || t('finance.noDescription')}
                date={tx.date}
                amount={tx.amount}
                currency={t('common.vnd')}
                type="expense"
                walletName={tx.walletName}
                formatMoney={formatMoney}
              />
            ))}
          </div>
        )}
      </div>
    </SaoModal>
  );
}
