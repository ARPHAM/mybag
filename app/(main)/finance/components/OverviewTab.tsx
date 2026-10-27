"use client";

import { useState } from 'react';
import {
  Wallet, ArrowUpRight, ArrowDownRight, Plus,
  Building2, Smartphone, Banknote,
  Coffee, Home as HomeIcon, ShoppingBag, Gamepad2, Car, CreditCard,
  Edit3
} from 'lucide-react';
import FinanceCharts from './FinanceCharts';
import SaoButton from '../../../components/SaoButton/SaoButton';
import styles from '../finance.module.css';
import type { WalletSource, Transaction } from '@/lib/types';

interface Props {
  wallets: WalletSource[];
  transactions: Transaction[];
  formatMoney: (n: number) => string;
  onAddTransaction: () => void;
  onEditWallet: (w: WalletSource) => void;
}

export function getWalletIcon(type: string) {
  switch (type) {
    case 'bank': return <Building2 size={24} />;
    case 'ewallet': return <Smartphone size={24} />;
    case 'cash': return <Banknote size={24} />;
    default: return <Wallet size={24} />;
  }
}

export function getCategoryIcon(category: string) {
  switch (category) {
    case 'food': return <Coffee size={18} color="#00ffaa" />;
    case 'housing': return <HomeIcon size={18} color="#00ffaa" />;
    case 'shopping': return <ShoppingBag size={18} color="#00ffaa" />;
    case 'entertainment': return <Gamepad2 size={18} color="#00ffaa" />;
    case 'transport': return <Car size={18} color="#00ffaa" />;
    default: return <CreditCard size={18} color="#00ffaa" />;
  }
}

export default function OverviewTab({ wallets, transactions, formatMoney, onAddTransaction, onEditWallet }: Props) {
  const currentMonth = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const monthlyIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className={styles.overviewGrid}>
      <div className={styles.totalBalanceCard}>
        <div className={styles.balanceLabel}>
          <Wallet size={20} /> Tổng Tài Sản
        </div>
        <div className={styles.balanceAmount}>
          {formatMoney(totalBalance)} <span className={styles.currency}>VND</span>
        </div>
      </div>

      <div className={`${styles.summaryCard} ${styles.income}`}>
        <div className={styles.summaryHeader}>
          <ArrowUpRight size={16} color="#00ffaa" style={{ flexShrink: 0 }} /> <span>Tổng Thu (Tháng)</span>
        </div>
        <div className={`${styles.summaryAmount} ${styles.income}`}>
          +{formatMoney(monthlyIncome)} <span style={{ fontSize: '0.8rem', color: '#a0c4ff', fontWeight: 'normal' }}>VND</span>
        </div>
      </div>

      <div className={`${styles.summaryCard} ${styles.expense}`}>
        <div className={styles.summaryHeader}>
          <ArrowDownRight size={16} color="#ff4444" style={{ flexShrink: 0 }} /> <span>Tổng Chi (Tháng)</span>
        </div>
        <div className={`${styles.summaryAmount} ${styles.expense}`}>
          -{formatMoney(monthlyExpense)} <span style={{ fontSize: '0.8rem', color: '#a0c4ff', fontWeight: 'normal' }}>VND</span>
        </div>
      </div>

      {/* Financial Charts */}
      <FinanceCharts transactions={transactions} formatMoney={formatMoney} />

      {/* Wallets preview */}
      <div className={styles.walletsGrid}>
        {wallets.map(wallet => (
          <div key={wallet.id} className={styles.walletCard} style={{ '--wallet-color': wallet.color } as React.CSSProperties}>
            <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); onEditWallet(wallet); }}>
              <Edit3 size={16} />
            </SaoButton>
            <div className={styles.walletTop}>
              <div className={styles.walletName}>
                {getWalletIcon(wallet.type)}
                {wallet.name}
              </div>
              <div className={styles.walletType}>{wallet.type}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#a0c4ff', textTransform: 'uppercase' }}>Số dư khả dụng</div>
              <div className={styles.walletBalance}>
                {formatMoney(wallet.balance)} <span className={styles.walletCurrency}>VND</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SaoButton
        variant="primary"
        className={styles.overviewFab}
        title="Ghi chép giao dịch"
        onClick={onAddTransaction}
      >
        <Plus size={28} />
      </SaoButton>
    </div>
  );
}
