"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Search,
  ArrowUpDown,
  Wallet,
  Sparkles,
  Loader2,
  PieChart
} from 'lucide-react';
import SaoModal from '../../../components/SaoModal/SaoModal';
import { getCategoryTransactions } from '../api';
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

  // Cache to avoid refetching same category/period multiple times
  const cacheRef = useRef<Record<string, Transaction[]>>({});

  useEffect(() => {
    if (!isOpen || !categoryKey) return;

    // Reset filters
    setSearchTerm('');
    setSelectedWallet('all');
    setSortBy('amount_desc');

    const cacheKey = `${categoryKey}_${startDate}_${endDate}`;
    if (cacheRef.current[cacheKey]) {
      setTransactions(cacheRef.current[cacheKey]);
      setLoading(false);
      return;
    }

    // 1. Instant fallback from client memory if available
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

    // 2. Fetch fresh granular data on demand from server
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

  // Distinct wallets for filter
  const walletOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.walletName) set.add(tx.walletName);
    });
    return Array.from(set);
  }, [transactions]);

  // Overall Statistics
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

  // Top 3 biggest expenses to answer "Why is this category so expensive?"
  const topExpenses = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
    return sorted.slice(0, 3);
  }, [transactions]);

  // Filtered & Sorted items
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
      title={`${t('finance.drilldownTitle')}: ${categoryName}`}
      icon={<PieChart size={20} color={categoryColor} />}
    >
      <div className={styles.modalContainer}>
        {/* Header Info */}
        <div className={styles.headerInfo}>
          <div className={styles.periodBadge}>
            <Calendar size={14} />
            <span>
              {period === '30days' ? t('finance.past30Days') : t('finance.past6Months')} ({startDate} → {endDate})
            </span>
          </div>
          <div
            className={styles.categoryTag}
            style={{ color: categoryColor, borderColor: categoryColor }}
          >
            <span>{categoryName}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>
              <DollarSign size={13} color="#00f0ff" /> {t('finance.totalExpense')}
            </div>
            <div className={styles.kpiValue} style={{ color: '#ff5555' }}>
              {formatMoney(stats.totalAmount)} {t('common.vnd')}
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>
              <Receipt size={13} color="#00f0ff" /> {t('finance.transactionCount')}
            </div>
            <div className={styles.kpiValue}>{stats.count} {t('finance.itemsOf')}</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>
              <ArrowUpDown size={13} color="#00f0ff" /> {t('finance.avgPerTx')}
            </div>
            <div className={styles.kpiValue}>{formatMoney(stats.avgAmount)} {t('common.vnd')}</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>
              <TrendingUp size={13} color="#ffd700" /> {t('finance.largestTx')}
            </div>
            <div className={styles.kpiValue} style={{ color: '#ffd700' }}>
              {stats.maxTx ? `${formatMoney(stats.maxTx.amount)} ${t('common.vnd')}` : `0 ${t('common.vnd')}`}
            </div>
          </div>
        </div>

        {/* Top Expenses Highlights */}
        {topExpenses.length > 0 && stats.totalAmount > 0 && (
          <div className={styles.topBox}>
            <div className={styles.topBoxHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} color="#00f0ff" />
                <span>{t('finance.topExpenseTitle')}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#a0c4ff' }}>Top {topExpenses.length}</span>
            </div>

            <div className={styles.topList}>
              {topExpenses.map((item, idx) => {
                const percent = Math.round((item.amount / stats.totalAmount) * 100);
                return (
                  <div key={item.id} className={styles.topItem}>
                    <div className={styles.topItemMain}>
                      <span className={`${styles.topRank} ${idx === 0 ? styles.topRank1 : ''}`}>
                        #{idx + 1}
                      </span>
                      <span className={styles.topDesc} title={item.description}>
                        {item.description}{' '}
                        <span className={styles.topDate}>({item.date})</span>
                      </span>
                      <span className={styles.topAmount}>
                        {formatMoney(item.amount)} {t('common.vnd')}{' '}
                        <span style={{ fontSize: '0.72rem', color: '#a0c4ff', fontWeight: 'normal' }}>
                          ({percent}%)
                        </span>
                      </span>
                    </div>
                    <div className={styles.topPercentBar}>
                      <div className={styles.topPercentFill} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className={styles.filterRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('finance.searchTxPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {walletOptions.length > 1 && (
            <select
              className={styles.selectControl}
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
            >
              <option value="all">{t('finance.allWallets')}</option>
              {walletOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          )}

          <select
            className={styles.selectControl}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="amount_desc">{t('finance.sortAmountDesc')}</option>
            <option value="date_desc">{t('finance.sortDateDesc')}</option>
            <option value="date_asc">{t('finance.sortDateAsc')}</option>
          </select>
        </div>

        {/* Detailed Transactions List */}
        {loading && transactions.length === 0 ? (
          <div className={styles.stateBox}>
            <Loader2 size={24} className="animate-spin" color="#00f0ff" />
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
              <div key={tx.id} className={styles.txRow}>
                <div className={styles.txLeft}>
                  <div className={styles.txDesc} title={tx.description}>
                    {tx.description}
                  </div>
                  <div className={styles.txMeta}>
                    <span>{tx.date}</span>
                    {tx.walletName && (
                      <span className={styles.walletBadge}>
                        <Wallet size={11} /> {tx.walletName}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.txRight}>-{formatMoney(tx.amount)} {t('common.vnd')}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className={styles.modalFooter}>
          <span>
            {t('finance.showingTransactions')} <strong>{displayItems.length}</strong> / {transactions.length} {t('finance.itemsOf')}
          </span>
          {loading && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00f0ff' }}>
              <Loader2 size={12} className="animate-spin" /> {t('common.loading')}
            </span>
          )}
        </div>
      </div>
    </SaoModal>
  );
}
