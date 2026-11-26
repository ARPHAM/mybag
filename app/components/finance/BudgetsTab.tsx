"use client";

import SaoFab from '../SaoFab';
import SaoBudgetCard from './SaoBudgetCard';
import styles from '@/app/(main)/finance/finance.module.css';
import type { BudgetPocket } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  budgets: BudgetPocket[];
  formatMoney: (n: number) => string;
  onAdd: () => void;
  onEdit: (b: BudgetPocket) => void;
}

export default function BudgetsTab({ budgets, formatMoney, onAdd, onEdit }: Props) {
  const { t } = useI18n();

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className={styles.budgetsGrid}>
        {budgets.map(pocket => (
          <SaoBudgetCard
            key={pocket.id}
            pocket={pocket}
            formatMoney={formatMoney}
            onEdit={onEdit}
          />
        ))}
      </div>

      <SaoFab
        title={t('finance.setupBudget')}
        onClick={onAdd}
        position="fixed"
      />
    </div>
  );
}
