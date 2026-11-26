"use client";

import React from 'react';
import {
  Edit3, Coffee, Home as HomeIcon,
  ShoppingBag, Gamepad2, Car, CreditCard, Package, HeartPulse
} from 'lucide-react';
import SaoButton from '../SaoButton';
import styles from './SaoBudgetCard.module.css';
import type { BudgetPocket } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface SaoBudgetCardProps {
  pocket: BudgetPocket;
  formatMoney: (n: number) => string;
  onEdit: (pocket: BudgetPocket) => void;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'food': return <Coffee size={18} />;
    case 'housing': return <HomeIcon size={18} />;
    case 'shopping': return <ShoppingBag size={18} />;
    case 'utilities': return <Package size={18} />;
    case 'entertainment': return <Gamepad2 size={18} />;
    case 'transport': return <Car size={18} />;
    case 'health': return <HeartPulse size={18} />;
    default: return <CreditCard size={18} />;
  }
}

export default function SaoBudgetCard({ pocket, formatMoney, onEdit }: SaoBudgetCardProps) {
  const { t } = useI18n();

  const percent = pocket.limit > 0 ? (pocket.spent / pocket.limit) * 100 : 0;
  const isOver = pocket.spent > pocket.limit;
  const cappedPercent = Math.min(percent, 100);

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (percent >= 100) {
    status = 'danger';
  } else if (percent >= 80) {
    status = 'warning';
  }

  const remaining = Math.max(0, pocket.limit - pocket.spent);
  const formattedPercent = percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(1);

  return (
    <div
      className={`${styles.card} ${styles[status]}`}
      onClick={() => onEdit(pocket)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(pocket);
        }
      }}
    >
      {/* Trục quang học mép trái phản ánh cấp độ HP */}
      <div className={styles.leftAccentBar} />

      {/* Cụm ngàm cơ khí góc trên - trái */}
      <div className={styles.cornerBracketTopLeft}>
        <div className={styles.topLeftBevelLine} />
        <div className={styles.bracketStripes} />
        <div className={styles.bracketDiamond} />
      </div>

      {/* Header thẻ: Tên danh mục bên trái, số tiền & nút edit bên phải (cùng hàng Flexbox) */}
      <div className={styles.cardHeader}>
        <div className={styles.identityGroup}>
          <div className={styles.iconBadge}>
            {getCategoryIcon(pocket.category)}
          </div>
          <span className={styles.pocketName} title={pocket.name}>
            {pocket.name}
          </span>
        </div>

        <div className={styles.actionGroup}>
          <div className={styles.amountsWrapper}>
            <span className={styles.spentAmount}>{formatMoney(pocket.spent)}</span>
            <span className={styles.divider}>/</span>
            <span className={styles.limitAmount}>{formatMoney(pocket.limit)}</span>
            <span className={styles.currency}>{t('common.currency')}</span>
          </div>

          <SaoButton
            variant="ghost"
            className={styles.editBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(pocket);
            }}
            title={t('common.edit')}
          >
            <Edit3 size={15} />
          </SaoButton>
        </div>
      </div>

      {/* Thanh đo HP Gauge chuẩn SAO: hiển thị trực tiếp Bội chi / Còn lại và % */}
      <div className={styles.hpSection}>
        <div className={styles.hpTelemetryRow}>
          <span
            className={styles.statusLabel}
            title={isOver ? `${t('finance.overspent')} (+${formatMoney(pocket.spent - pocket.limit)} ${t('common.currency')})` : ''}
          >
            {isOver
              ? `${t('finance.overspent')} (+${formatMoney(pocket.spent - pocket.limit)} ${t('common.currency')})`
              : status === 'warning'
              ? `${t('finance.nearLimit')} (${t('finance.leftOnly')} ${formatMoney(remaining)} ${t('common.currency')})`
              : `${t('finance.remaining')}: ${formatMoney(remaining)} ${t('common.currency')}`}
          </span>
          <span className={styles.percentBadge}>
            {formattedPercent}%
          </span>
        </div>

        <div className={styles.hpTrack}>
          <div
            className={`${styles.hpFill} ${styles[status]}`}
            style={{ width: `${cappedPercent}%` }}
          />
        </div>
      </div>

      {/* Cụm ngàm cơ khí góc dưới - phải */}
      <div className={styles.cornerBracketBottomRight}>
        <div className={styles.bottomRightBevelLine} />
        <div className={styles.bottomRightDiamond} />
      </div>
    </div>
  );
}
