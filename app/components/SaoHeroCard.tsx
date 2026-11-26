"use client";

import React from 'react';
import styles from './SaoHeroCard.module.css';

export type HeroCardVariant = 'primary' | 'cyan' | 'gold' | 'danger' | 'purple';

export interface SaoHeroCardProps {
  title: string;
  amount: string | number;
  currency?: string;
  icon?: React.ReactNode;
  variant?: HeroCardVariant;
  subLabel?: string | React.ReactNode;
  extraContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function SaoHeroCard({
  title,
  amount,
  currency,
  icon,
  variant = 'primary',
  subLabel,
  extraContent,
  className = '',
  onClick,
}: SaoHeroCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`${styles.heroCard} ${styles[variant]} ${isClickable ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {/* Cụm ngàm công nghệ đa tầng góc trên - trái (Intricate Top-Left Tech Bracket) */}
      <div className={styles.cornerBracketTopLeft} aria-hidden="true">
        <div className={styles.bracketBevel} />
        <div className={styles.bracketStripes} />
        <div className={styles.bracketDiamond} />
        <div className={styles.bracketRailH} />
        <div className={styles.bracketRailV} />
      </div>

      {/* Cụm trang trí đối xứng góc trên - phải (Top-Right Balance Notch) */}
      <div className={styles.cornerAccentTopRight} aria-hidden="true">
        <div className={styles.topRightDiamond} />
        <div className={styles.topRightLine} />
      </div>

      {/* Tiêu đề & Icon */}
      <div className={styles.titleRow}>
        {icon && <span className={styles.iconBadge}>{icon}</span>}
        <span className={styles.titleText}>{title}</span>
      </div>

      {/* Số liệu chính (Hero Amount) */}
      <div className={styles.amountRow}>
        <span className={styles.amountNumber}>{amount}</span>
        {currency && <span className={styles.currency}>{currency}</span>}
      </div>

      {/* Phụ đề hoặc nội dung phụ nếu có */}
      {subLabel && <div className={styles.subLabel}>{subLabel}</div>}
      {extraContent && <div className={styles.extraContent}>{extraContent}</div>}

      {/* Tia laser quang học đáy card */}
      <div className={styles.bottomLaserBeam} aria-hidden="true" />

      {/* Cụm ngàm công nghệ đa tầng góc dưới - phải (Intricate Bottom-Right Tech Bracket) */}
      <div className={styles.cornerBracketBottomRight} aria-hidden="true">
        <div className={styles.bottomRightBevelLine} />
        <div className={styles.bottomRightStripes} />
        <div className={styles.bottomRightDiamond} />
        <div className={styles.bottomRightRailH} />
        <div className={styles.bottomRightRailV} />
      </div>
    </div>
  );
}
