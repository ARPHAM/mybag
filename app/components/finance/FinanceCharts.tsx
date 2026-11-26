"use client";

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, ChevronRight } from 'lucide-react';
import SaoButton from '../SaoButton';
import SaoPanel from '../SaoPanel';
import styles from '@/app/(main)/finance/finance.module.css';
import type { Transaction } from '@/lib/types';
import { FINANCE_CATEGORY_OPTIONS } from '@/lib/constants/finance';
import { useI18n } from '@/lib/i18n';
import CategoryDrilldownModal from './CategoryDrilldownModal';

interface FinanceChartsProps {
  transactions: Transaction[];
  formatMoney: (n: number) => string;
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  food: 'Ăn uống',
  housing: 'Nhà cửa & Sinh hoạt',
  transport: 'Đi lại',
  entertainment: 'Giải trí',
  shopping: 'Mua sắm',
  utilities: 'Đồ dùng',
  spices: 'Gia vị',
  health: 'Sức khoẻ',
  other: 'Khác'
};
FINANCE_CATEGORY_OPTIONS.forEach(c => {
  CATEGORY_LABEL_MAP[c.value] = c.label;
});

const CATEGORY_COLORS: Record<string, string> = {
  food: '#00ffaa',
  housing: '#38bdf8',
  transport: '#f59e0b',
  entertainment: '#ec4899',
  shopping: '#a855f7',
  utilities: '#00f0ff',
  spices: '#10b981',
  health: '#22c55e',
  other: '#94a3b8'
};

export default function FinanceCharts({ transactions, formatMoney }: FinanceChartsProps) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<'comparison' | 'category'>('comparison');
  const [period, setPeriod] = useState<'30days' | '6months'>('30days');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getCategoryName = (key: string) => {
    const normalizedKey = key.toLowerCase().trim();
    const i18nKey = `finance.categories.${normalizedKey}`;
    const translated = (t as any)(i18nKey);
    if (translated && translated !== i18nKey) return translated;
    return CATEGORY_LABEL_MAP[normalizedKey] || CATEGORY_LABEL_MAP[key] || key;
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const cutoffDate = new Date();
    if (period === '30days') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    } else {
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    }
    const startDate = new Date(cutoffDate.getTime() - cutoffDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    return { startDate, endDate };
  }, [period]);

  const comparisonData = useMemo(() => {
    if (period === '30days') {
      const daysMap: Record<string, { date: string; income: number; expense: number }> = {};
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const isoDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const displayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
        daysMap[isoDate] = { date: displayLabel, income: 0, expense: 0 };
      }

      transactions.forEach(tx => {
        if (daysMap[tx.date]) {
          if (tx.type === 'income') {
            daysMap[tx.date].income += tx.amount;
          } else if (tx.type === 'expense') {
            daysMap[tx.date].expense += tx.amount;
          }
        }
      });

      return Object.values(daysMap);
    } else {
      const monthsMap: Record<string, { date: string; income: number; expense: number }> = {};
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const displayLabel = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
        monthsMap[monthKey] = { date: displayLabel, income: 0, expense: 0 };
      }

      transactions.forEach(tx => {
        const monthKey = tx.date.slice(0, 7);
        if (monthsMap[monthKey]) {
          if (tx.type === 'income') {
            monthsMap[monthKey].income += tx.amount;
          } else if (tx.type === 'expense') {
            monthsMap[monthKey].expense += tx.amount;
          }
        }
      });

      return Object.values(monthsMap);
    }
  }, [transactions, period]);

  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let totalExpense = 0;
    const { startDate, endDate } = dateRange;

    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.date >= startDate && tx.date <= endDate) {
        const cat = tx.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
        totalExpense += tx.amount;
      }
    });

    const result = Object.entries(categoryTotals)
      .map(([key, amount]) => {
        const normalizedKey = key.toLowerCase().trim();
        return {
          categoryKey: key,
          name: getCategoryName(key),
          amount,
          percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
          color: CATEGORY_COLORS[normalizedKey] || CATEGORY_COLORS[key] || '#00f0ff'
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { items: result, totalExpense };
  }, [transactions, period, t]);

  const CustomComparisonTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(5, 15, 25, 0.95)',
          border: '1px solid var(--sao-primary-hex)',
          padding: '10px 14px',
          borderRadius: '4px',
          boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
          backdropFilter: 'blur(8px)'
        }}>
          <p style={{ color: '#a0c4ff', margin: '0 0 8px 0', fontWeight: 'bold' }}>{t('finance.timeLabel')}: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{
              color: entry.dataKey === 'income' ? '#00f0ff' : '#ff4444',
              margin: '3px 0',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '15px'
            }}>
              <span>{entry.dataKey === 'income' ? `● ${t('finance.income')}:` : `● ${t('finance.expense')}:`}</span>
              <span style={{ fontWeight: 'bold' }}>{formatMoney(entry.value)} {t('common.currency')}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(5, 15, 25, 0.95)',
          border: '1px solid var(--sao-primary-hex)',
          padding: '10px 14px',
          borderRadius: '4px',
          boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
          backdropFilter: 'blur(8px)'
        }}>
          <p style={{ color: data.color, margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '1rem' }}>{data.name}</p>
          <p style={{ color: '#fff', margin: '2px 0', fontSize: '0.9rem' }}>
            {t('finance.spentLabel')}: <span style={{ fontWeight: 'bold' }}>{formatMoney(data.amount)} {t('common.currency')}</span>
          </p>
          <p style={{ color: '#a0c4ff', margin: '2px 0', fontSize: '0.85rem' }}>
            {t('finance.ratioLabel')}: <span style={{ fontWeight: 'bold' }}>{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <SaoPanel
      title={t('finance.chartTitle')}
      icon={<TrendingUp size={20} color="var(--sao-primary-hex)" />}
      headerActions={
        <div className={styles.chartsControls}>
          <div className={styles.chartsControlGroup}>
            <SaoButton
              variant={viewMode === 'comparison' ? 'primary' : 'ghost'}
              active={viewMode === 'comparison'}
              className={styles.chartControlBtn}
              onClick={() => setViewMode('comparison')}
            >
              <TrendingUp size={13} style={{ marginRight: 4 }} />
              {t('finance.chartIncomeExpense')}
            </SaoButton>
            <SaoButton
              variant={viewMode === 'category' ? 'primary' : 'ghost'}
              active={viewMode === 'category'}
              className={styles.chartControlBtn}
              onClick={() => setViewMode('category')}
            >
              <PieChartIcon size={13} style={{ marginRight: 4 }} />
              {t('finance.chartCategory')}
            </SaoButton>
          </div>

          <span className={styles.chartsDivider}>|</span>

          <div className={styles.chartsControlGroup}>
            <SaoButton
              variant={period === '30days' ? 'primary' : 'ghost'}
              active={period === '30days'}
              className={styles.chartControlBtn}
              onClick={() => setPeriod('30days')}
            >
              {t('finance.filter30Days')}
            </SaoButton>
            <SaoButton
              variant={period === '6months' ? 'primary' : 'ghost'}
              active={period === '6months'}
              className={styles.chartControlBtn}
              onClick={() => setPeriod('6months')}
            >
              {t('finance.filter6Months')}
            </SaoButton>
          </div>
        </div>
      }
    >

      {viewMode === 'comparison' ? (
        <div className={styles.comparisonChartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 6, bottom: 5, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.15)" vertical={false} />
              <XAxis dataKey="date" stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 10 }} />
              <YAxis
                stroke="#a0c4ff"
                tick={{ fill: '#a0c4ff', fontSize: 10 }}
                width={48}
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
              />
              <Tooltip content={<CustomComparisonTooltip />} cursor={{ fill: 'rgba(0, 240, 255, 0.08)' }} />
              <Legend
                formatter={(value) => (
                  <span style={{ color: value === 'income' ? '#00f0ff' : '#ff4444', fontSize: '0.82rem', fontWeight: 'bold' }}>
                    {value === 'income' ? t('finance.income') : t('finance.expense')}
                  </span>
                )}
              />
              <Bar dataKey="income" name="income" fill="#00f0ff" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="expense" name="expense" fill="#ff4444" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={categoryData.items.length > 0 ? styles.categoryChartGrid : styles.categoryChartGridEmpty}>
          {categoryData.items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a0c4ff', padding: '40px 0', fontStyle: 'italic' }}>
              {t('finance.noExpensePeriod')}
            </div>
          ) : (
            <>
              <div className={styles.categoryBarBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={categoryData.items}
                    margin={{ top: 5, right: 16, bottom: 5, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.15)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#a0c4ff"
                      tick={{ fill: '#a0c4ff', fontSize: 10 }}
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis dataKey="name" type="category" width={75} stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 11 }} />
                    <Tooltip content={<CustomCategoryTooltip />} cursor={{ fill: 'rgba(0, 240, 255, 0.08)' }} />
                    <Bar
                      dataKey="amount"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={20}
                      style={{ cursor: 'pointer' }}
                      onClick={(entry: any) => {
                        if (entry && entry.categoryKey) {
                          setSelectedCategory(entry.categoryKey);
                        }
                      }}
                    >
                      {categoryData.items.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={styles.categoryBreakdownCard}>
                <span className={styles.categoryBreakdownBevelTL} aria-hidden="true" />
                <span className={styles.categoryBreakdownDiamondTL} aria-hidden="true" />
                <span className={styles.categoryBreakdownBevelBR} aria-hidden="true" />
                <span className={styles.categoryBreakdownDiamondBR} aria-hidden="true" />

                <div className={styles.categoryBreakdownHeader}>
                  <span>{t('finance.totalExpense')}</span>
                  <span className={styles.categoryTotalExpenseValue}>
                    -{formatMoney(categoryData.totalExpense)} {t('common.currency')}
                  </span>
                </div>
                {categoryData.items.map(item => (
                  <div
                    key={item.categoryKey}
                    className={styles.categoryItemRow}
                    onClick={() => setSelectedCategory(item.categoryKey)}
                    role="button"
                    tabIndex={0}
                    title={t('finance.drilldownHint')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        className={styles.categoryColorPip}
                        style={{
                          backgroundColor: item.color,
                          boxShadow: `0 0 6px ${item.color}`
                        }}
                      />
                      <span className={styles.categoryItemName}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.categoryItemAmount}>{formatMoney(item.amount)}</span>
                      <span
                        className={styles.categoryItemPercent}
                        style={{
                          color: item.color,
                          textShadow: `0 0 8px ${item.color}66`
                        }}
                      >
                        {item.percentage}%
                      </span>
                      <ChevronRight size={14} className={styles.categoryChevron} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedCategory && (
        <CategoryDrilldownModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          categoryKey={selectedCategory}
          categoryName={getCategoryName(selectedCategory)}
          categoryColor={CATEGORY_COLORS[selectedCategory.toLowerCase().trim()] || CATEGORY_COLORS[selectedCategory] || '#00f0ff'}
          period={period}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          formatMoney={formatMoney}
          fallbackTransactions={transactions}
        />
      )}
    </SaoPanel>
  );
}
