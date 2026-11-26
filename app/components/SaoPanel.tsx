"use client";

import React from 'react';
import styles from './SaoPanel.module.css';

export type PanelVariant = 'primary' | 'cyan' | 'gold' | 'danger' | 'purple';

export interface SaoPanelProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  variant?: PanelVariant;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
}

export default function SaoPanel({
  children,
  title,
  icon,
  headerActions,
  variant = 'primary',
  className = '',
  style,
  noPadding = false,
}: SaoPanelProps) {
  const hasHeader = Boolean(title || headerActions);

  return (
    <section
      className={`${styles.panel} ${styles[variant]} ${noPadding ? styles.noPadding : ''} ${className}`}
      style={style}
    >
      {/* ========================================================
         CỤM HOA VĂN CƠ KHÍ HUD XUNG QUANH PANEL (INTRICATE CHASSIS)
         ======================================================== */}
      {/* 1. Ngàm cơ khí góc trên - trái */}
      <div className={styles.cornerBracketTopLeft} aria-hidden="true">
        <div className={styles.topLeftBevelLine} />
        <div className={styles.bracketStripes} />
        <div className={styles.bracketDiamond} />
        <div className={styles.bracketRailH} />
        <div className={styles.bracketRailV} />
      </div>

      {/* 2. Cụm cân bằng góc trên - phải */}
      <div className={styles.cornerAccentTopRight} aria-hidden="true">
        <div className={styles.topRightDiamond} />
        <div className={styles.topRightLine} />
      </div>

      {/* 3. Ngàm cơ khí góc dưới - phải */}
      <div className={styles.cornerBracketBottomRight} aria-hidden="true">
        <div className={styles.bottomRightBevelLine} />
        <div className={styles.bottomRightStripes} />
        <div className={styles.bottomRightDiamond} />
        <div className={styles.bottomRightRailH} />
        <div className={styles.bottomRightRailV} />
      </div>

      {/* 4. Cụm cân bằng góc dưới - trái */}
      <div className={styles.cornerAccentBottomLeft} aria-hidden="true">
        <div className={styles.bottomLeftDiamond} />
        <div className={styles.bottomLeftLine} />
      </div>

      {/* 5. Tia laser quang học chạy dọc đáy */}
      <div className={styles.bottomLaserBeam} aria-hidden="true" />

      {/* ========================================================
         TIÊU ĐỀ & THANH ĐIỀU KHIỂN PANEL (NẾU CÓ)
         ======================================================== */}
      {hasHeader && (
        <header className={styles.panelHeader}>
          <div className={styles.titleContainer}>
            {icon && <span className={styles.titleIcon}>{icon}</span>}
            {title && <span className={styles.titleText}>{title}</span>}
          </div>
          {headerActions && <div className={styles.headerActions}>{headerActions}</div>}
        </header>
      )}

      {/* ========================================================
         NỘI DUNG CHÍNH (BODY)
         ======================================================== */}
      <div className={styles.panelBody}>
        {children}
      </div>
    </section>
  );
}
