import React from 'react';
import { Check } from 'lucide-react';
import styles from './LanguageCard.module.css';

export interface LanguageCardProps {
  code: 'vi' | 'en';
  title: string;
  sub: string;
  flag: string;
  isActive: boolean;
  onSelect: () => void;
}

export default function LanguageCard({
  code,
  title,
  sub,
  flag,
  isActive,
  onSelect
}: LanguageCardProps) {
  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : styles.inactive}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className={styles.leftBar} />
      <div className={styles.flagBadge}>
        {flag}
      </div>
      <div className={styles.info}>
        <div className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          <span className={styles.codeBadge}>{code.toUpperCase()}</span>
        </div>
        <div className={styles.sub}>{sub}</div>
      </div>
      <div className={styles.statusIndicator}>
        {isActive ? (
          <div className={styles.activePill}>
            <div className={styles.checkIconWrap}>
              <Check size={14} strokeWidth={3.5} />
            </div>
            <span className={styles.activeText}>ACTIVE</span>
          </div>
        ) : (
          <div className={styles.inactiveSlot}>
            <span className={styles.inactiveDot} />
          </div>
        )}
      </div>
    </div>
  );
}
