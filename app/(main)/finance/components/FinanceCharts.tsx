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
import { TrendingUp, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import SaoButton from '../../../components/SaoButton/SaoButton';
import type { Transaction } from '@/lib/types';
import { FINANCE_CATEGORY_OPTIONS } from '@/lib/constants/finance';

interface FinanceChartsProps {
  transactions: Transaction[];
  formatMoney: (n: number) => string;
}

const CATEGORY_LABEL_MAP: Record<string, string> = {};
FINANCE_CATEGORY_OPTIONS.forEach(c => {
  CATEGORY_LABEL_MAP[c.value] = c.label;
});

const CATEGORY_COLORS: Record<string, string> = {
  food: '#00ffaa',
  housing: '#38bdf8',
  transport: '#f59e0b',
  entertainment: '#ec4899',
  shopping: '#a855f7',
  health: '#10b981',
  other: '#94a3b8'
};

export default function FinanceCharts({ transactions, formatMoney }: FinanceChartsProps) {
  const [viewMode, setViewMode] = useState<'comparison' | 'category'>('comparison');
  const [period, setPeriod] = useState<'30days' | '6months'>('30days');

  // 1. Process Income vs Expense Comparison Data
  const comparisonData = useMemo(() => {
    if (period === '30days') {
      const daysMap: Record<string, { date: string; income: number; expense: number }> = {};
      const now = new Date();

      // Last 30 days
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
      // Last 6 months
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

  // 2. Process Category Breakdown Data (Expenses only)
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let totalExpense = 0;

    const cutoffDate = new Date();
    if (period === '30days') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    } else {
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    }
    const cutoffStr = new Date(cutoffDate.getTime() - cutoffDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.date >= cutoffStr) {
        const cat = tx.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
        totalExpense += tx.amount;
      }
    });

    const result = Object.entries(categoryTotals)
      .map(([key, amount]) => ({
        categoryKey: key,
        name: CATEGORY_LABEL_MAP[key] || key,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
        color: CATEGORY_COLORS[key] || '#00f0ff'
      }))
      .sort((a, b) => b.amount - a.amount);

    return { items: result, totalExpense };
  }, [transactions, period]);

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
          <p style={{ color: '#a0c4ff', margin: '0 0 8px 0', fontWeight: 'bold' }}>Thời gian: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{
              color: entry.dataKey === 'income' ? '#00f0ff' : '#ff4444',
              margin: '3px 0',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '15px'
            }}>
              <span>{entry.dataKey === 'income' ? '● Thu nhập:' : '● Chi tiêu:'}</span>
              <span style={{ fontWeight: 'bold' }}>{formatMoney(entry.value)} VND</span>
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
            Chi tiêu: <span style={{ fontWeight: 'bold' }}>{formatMoney(data.amount)} VND</span>
          </p>
          <p style={{ color: '#a0c4ff', margin: '2px 0', fontSize: '0.85rem' }}>
            Tỷ trọng: <span style={{ fontWeight: 'bold' }}>{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      background: 'rgba(10, 25, 45, 0.65)',
      border: '1px solid rgba(var(--sao-primary-rgb), 0.3)',
      padding: '20px',
      clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
      boxShadow: 'inset 0 0 20px rgba(var(--sao-primary-rgb), 0.08)',
      gridColumn: 'span 2',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }}>
      {/* Chart Header & Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid rgba(var(--sao-primary-rgb), 0.2)',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={22} color="var(--sao-primary-hex)" />
          <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>
            BIỂU ĐỒ TÀI CHÍNH
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View mode toggle */}
          <SaoButton
            variant={viewMode === 'comparison' ? 'primary' : 'ghost'}
            style={{ padding: '4px 12px', fontSize: '0.85rem' }}
            onClick={() => setViewMode('comparison')}
          >
            <TrendingUp size={14} style={{ marginRight: 5 }} />
            Thu & Chi
          </SaoButton>
          <SaoButton
            variant={viewMode === 'category' ? 'primary' : 'ghost'}
            style={{ padding: '4px 12px', fontSize: '0.85rem' }}
            onClick={() => setViewMode('category')}
          >
            <PieChartIcon size={14} style={{ marginRight: 5 }} />
            Danh mục
          </SaoButton>

          <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>|</span>

          {/* Period toggle */}
          <SaoButton
            variant={period === '30days' ? 'primary' : 'ghost'}
            style={{ padding: '4px 10px', fontSize: '0.85rem' }}
            onClick={() => setPeriod('30days')}
          >
            30 Ngày
          </SaoButton>
          <SaoButton
            variant={period === '6months' ? 'primary' : 'ghost'}
            style={{ padding: '4px 10px', fontSize: '0.85rem' }}
            onClick={() => setPeriod('6months')}
          >
            6 Tháng
          </SaoButton>
        </div>
      </div>

      {/* Chart Content */}
      {viewMode === 'comparison' ? (
        <div style={{ height: '280px', width: '100%', marginTop: '5px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.15)" vertical={false} />
              <XAxis dataKey="date" stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 11 }} />
              <YAxis
                stroke="#a0c4ff"
                tick={{ fill: '#a0c4ff', fontSize: 11 }}
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
              />
              <Tooltip content={<CustomComparisonTooltip />} cursor={{ fill: 'rgba(0, 240, 255, 0.08)' }} />
              <Legend
                formatter={(value) => (
                  <span style={{ color: value === 'income' ? '#00f0ff' : '#ff4444', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {value === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                  </span>
                )}
              />
              <Bar dataKey="income" name="income" fill="#00f0ff" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="expense" name="expense" fill="#ff4444" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: categoryData.items.length > 0 ? '1.5fr 1fr' : '1fr', gap: '20px', minHeight: '260px', alignItems: 'center' }}>
          {categoryData.items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a0c4ff', padding: '40px 0', fontStyle: 'italic' }}>
              Chưa có dữ liệu chi tiêu trong khoảng thời gian này.
            </div>
          ) : (
            <>
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={categoryData.items}
                    margin={{ top: 5, right: 30, bottom: 5, left: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.15)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#a0c4ff"
                      tick={{ fill: '#a0c4ff', fontSize: 11 }}
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis dataKey="name" type="category" stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 12 }} />
                    <Tooltip content={<CustomCategoryTooltip />} cursor={{ fill: 'rgba(0, 240, 255, 0.08)' }} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {categoryData.items.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & Breakdown list */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'rgba(5, 15, 25, 0.6)',
                padding: '14px',
                borderRadius: '4px',
                border: '1px solid rgba(var(--sao-primary-rgb), 0.2)'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#a0c4ff', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Tổng chi: <span style={{ color: '#ff4444', fontWeight: 'bold' }}>{formatMoney(categoryData.totalExpense)} VND</span>
                </div>
                {categoryData.items.map(item => (
                  <div key={item.categoryKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
                      <span style={{ color: '#fff' }}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#a0c4ff' }}>{formatMoney(item.amount)}</span>
                      <span style={{ color: item.color, fontWeight: 'bold', width: '35px', textAlign: 'right' }}>{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
