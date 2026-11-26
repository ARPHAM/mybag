"use client";

import FinanceCharts from './FinanceCharts';
import NetWorthCard from './NetWorthCard';
import SaoFab from '../SaoFab';
import styles from '@/app/(main)/finance/finance.module.css';
import type { WalletSource, Transaction } from '@/lib/types';

interface Props {
  wallets: WalletSource[];
  transactions: Transaction[];
  formatMoney: (n: number) => string;
  onAddTransaction: () => void;
  onEditWallet?: (w: WalletSource) => void;
}

export default function OverviewTab({ wallets, transactions, formatMoney, onAddTransaction }: Props) {
  const currentMonth = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const monthlyIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className={styles.overviewGrid}>
      <NetWorthCard
        totalBalance={totalBalance}
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        formatMoney={formatMoney}
      />

      <FinanceCharts transactions={transactions} formatMoney={formatMoney} />

      <SaoFab
        title="Thêm giao dịch"
        onClick={onAddTransaction}
        position="fixed"
      />
    </div>
  );
}
