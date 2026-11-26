"use client";

import React, { ReactNode } from 'react';
import styles from './SaoStatCard.module.css';

export interface SaoStatCardProps {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  variant?: 'default' | 'cyan' | 'red' | 'gold' | 'green';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function SaoStatCard({
  label,
  value,
  unit,
  icon,
  variant = 'default',
  className = '',
  style,
  onClick
}: SaoStatCardProps) {
  const variantClass = styles[variant] || '';

  return (
    <div
      className={`${styles.statCard} ${variantClass} ${onClick ? styles.clickable : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {/* Đường viền neon liền mạch góc vát trên - trái */}
      <div className={styles.bevelTL} aria-hidden="true" />

      {/* Label & Icon Header */}
      <div className={styles.labelRow}>
        {icon && <span className={styles.iconWrapper}>{icon}</span>}
        <span className={styles.labelText}>{label}</span>
      </div>

      {/* Value & Unit */}
      <div className={styles.valueRow}>
        <span className={styles.valueText}>{value}</span>
        {unit && <span className={styles.unitText}>{unit}</span>}
      </div>
    </div>
  );
}
