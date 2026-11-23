import React from 'react';
import styles from './SaoTabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode | React.ComponentType<{ size?: number; className?: string }>;
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
      {tabs.map(tab => {
        let renderedIcon: React.ReactNode = null;
        if (tab.icon) {
          if (React.isValidElement(tab.icon)) {
            renderedIcon = tab.icon;
          } else if (
            typeof tab.icon === 'function' ||
            (typeof tab.icon === 'object' && tab.icon !== null && ('render' in tab.icon || '$$typeof' in tab.icon))
          ) {
            const IconComp = tab.icon as React.ComponentType<{ size?: number }>;
            renderedIcon = <IconComp size={18} />;
          } else {
            renderedIcon = tab.icon as React.ReactNode;
          }
        }

        return (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {renderedIcon && <span className={styles.iconWrapper}>{renderedIcon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
