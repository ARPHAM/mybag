import React from 'react';
import { Check } from 'lucide-react';
import styles from './ThemeCard.module.css';

export interface ThemeConfig {
  id: string;
  name: string;
  desc: string;
  color: string;
}

export interface ThemeCardProps {
  theme: ThemeConfig;
  isActive: boolean;
  onSelect: (themeId: string) => void;
}

export default function ThemeCard({ theme, isActive, onSelect }: ThemeCardProps) {
  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : ''}`}
      onClick={() => onSelect(theme.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(theme.id);
        }
      }}
    >
      <div className={styles.coreContainer}>
        <div
          className={styles.energyOrb}
          style={{
            backgroundColor: theme.color,
            boxShadow: `0 0 16px ${theme.color}, inset 0 0 8px #ffffff`
          }}
        >
          {isActive && <Check size={18} className={styles.checkIcon} />}
        </div>
        <div
          className={styles.orbPulseRing}
          style={{
            borderColor: theme.color
          }}
        />
      </div>

      <div className={styles.themeInfo}>
        <div className={styles.themeName} style={isActive ? { color: theme.color } : {}}>
          {theme.name}
        </div>
        <div className={styles.themeDesc}>{theme.desc}</div>
      </div>

      {isActive && (
        <div
          className={styles.activeTag}
          style={{
            color: theme.color,
            borderColor: theme.color,
            background: `${theme.color}15`
          }}
        >
          ONLINE
        </div>
      )}
    </div>
  );
}
