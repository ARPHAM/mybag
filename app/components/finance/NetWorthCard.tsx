"use client";

import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import SaoHeroCard from '../SaoHeroCard';
import SaoSummaryCard from '../SaoSummaryCard';
import styles from './NetWorthCard.module.css';

interface NetWorthCardProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  formatMoney: (n: number) => string;
}

export default function NetWorthCard({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  formatMoney,
}: NetWorthCardProps) {
  const { t } = useI18n();

  return (
    <div className={styles.container}>
      <SaoHeroCard
        variant="primary"
        title={t('finance.totalBalance')}
        amount={formatMoney(totalBalance)}
        currency={t('common.currency')}
        icon={<Wallet size={18} />}
      />

      <div className={styles.summaryRow}>
        <SaoSummaryCard
          variant="income"
          title={t('finance.totalIncome')}
          amount={formatMoney(monthlyIncome)}
          prefix="+"
          currency={t('common.currency')}
          icon={<ArrowUpRight size={16} />}
        />
        <SaoSummaryCard
          variant="expense"
          title={t('finance.totalExpense')}
          amount={formatMoney(monthlyExpense)}
          prefix="-"
          currency={t('common.currency')}
          icon={<ArrowDownRight size={16} />}
        />
      </div>
    </div>
  );
}
