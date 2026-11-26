"use client";

import React from 'react';
import styles from './SaoSummaryCard.module.css';

export type SummaryCardVariant = 'income' | 'expense' | 'balance' | 'primary' | 'default';

export interface SaoSummaryCardProps {
  title: string;
  amount: string | number;
  currency?: string;
  icon?: React.ReactNode;
  variant?: SummaryCardVariant;
  prefix?: string;
  subText?: string;
  className?: string;
  onClick?: () => void;
}

export default function SaoSummaryCard({
  title,
  amount,
  currency = 'đ',
  icon,
  variant = 'default',
  prefix,
  subText,
  className = '',
  onClick,
}: SaoSummaryCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`${styles.card} ${styles[variant]} ${isClickable ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className={styles.header}>
        {icon && <div className={`${styles.iconBadge} ${styles[variant]}`}>{icon}</div>}
        <span className={styles.title}>{title}</span>
      </div>

      <div className={`${styles.amountWrapper} ${styles[variant]}`}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <span className={styles.amount}>{amount}</span>
        {currency && <span className={styles.currency}>{currency}</span>}
      </div>

      {subText && <div className={styles.subText}>{subText}</div>}

      {/* Cụm ngàm cơ khí góc trên - trái (Intricate Top-Left Tech Bracket) */}
      <div className={styles.cornerBracket} aria-hidden="true">
        <div className={styles.bracketAngle} />
        <div className={styles.bracketDiamond} />
        <div className={styles.bracketStripes} />
        <div className={styles.bracketHairline} />
      </div>

      {/* Cụm ngàm cơ khí góc dưới - phải (Intricate Bottom-Right Tech Bracket) */}
      <div className={styles.cornerBracketBottomRight} aria-hidden="true">
        <div className={styles.bottomRightBevelLine} />
        <div className={styles.bottomRightDiamond} />
        <div className={styles.bottomRightStripes} />
        <div className={styles.bottomRightHairline} />
      </div>
    </div>
  );
}
