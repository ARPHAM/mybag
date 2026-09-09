import React from 'react';
import styles from './SaoTabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SaoTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  theme?: 'cyan' | 'yellow' | 'green'; // kept for backwards compatibility but unused
}

export default function SaoTabs({ tabs, activeTab, onChange }: SaoTabsProps) {
  return (
    <div className={styles.tabsContainer}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span className={styles.iconWrapper}>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
