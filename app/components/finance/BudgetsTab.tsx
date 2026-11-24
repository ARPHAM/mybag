"use client";

import { useState } from 'react';
import {
  Plus, Edit3, AlertTriangle,
  Coffee, Home as HomeIcon, ShoppingBag, Gamepad2, Car, CreditCard, Package
} from 'lucide-react';
import SaoButton from '../SaoButton';
import styles from '@/app/(main)/finance/finance.module.css';
import type { BudgetPocket } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  budgets: BudgetPocket[];
  formatMoney: (n: number) => string;
  onAdd: () => void;
  onEdit: (b: BudgetPocket) => void;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'food': return <Coffee size={18} color="#00ffaa" />;
    case 'housing': return <HomeIcon size={18} color="#00ffaa" />;
    case 'shopping': return <ShoppingBag size={18} color="#00ffaa" />;
    case 'utilities': return <Package size={18} color="#00f0ff" />;
    case 'entertainment': return <Gamepad2 size={18} color="#00ffaa" />;
    case 'transport': return <Car size={18} color="#00ffaa" />;
    default: return <CreditCard size={18} color="#00ffaa" />;
  }
}

export default function BudgetsTab({ budgets, formatMoney, onAdd, onEdit }: Props) {
  const { t } = useI18n();

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className={styles.budgetsGrid}>
        {budgets.map(pocket => {
          const percent = Math.min((pocket.spent / pocket.limit) * 100, 100);
          const isOver = pocket.spent > pocket.limit;

          let hpClass = styles.hpSafe;
          if (percent >= 100) hpClass = styles.hpDanger;
          else if (percent >= 80) hpClass = styles.hpWarning;

          return (
            <div key={pocket.id} className={styles.budgetCard}>
              <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); onEdit(pocket); }}>
                <Edit3 size={16} />
              </SaoButton>
              <div className={styles.budgetHeader}>
                <div className={styles.budgetName}>
                  {getCategoryIcon(pocket.category)}
                  {pocket.name}
                </div>
                <div className={styles.budgetAmounts}>
                  <span>{formatMoney(pocket.spent)}</span> / {formatMoney(pocket.limit)} <small>{t('common.currency')}</small>
                </div>
              </div>

              <div className={styles.hpBarContainer}>
                <div className={`${styles.hpBarFill} ${hpClass}`} style={{ width: `${percent}%` }} />
              </div>

              {isOver && (
                <div className={styles.overBudgetText}>
                  <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  {t('finance.overBudgetText')} {formatMoney(pocket.spent - pocket.limit)} {t('common.currency')}!
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SaoButton
        variant="primary"
        className={styles.overviewFab}
        title={t('finance.setupBudget')}
        onClick={onAdd}
      >
        <Plus size={28} />
      </SaoButton>
    </div>
  );
}
