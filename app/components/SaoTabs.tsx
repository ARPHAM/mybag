"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, Check, Layers } from 'lucide-react';
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
  urlParamKey?: string;
  theme?: 'cyan' | 'yellow' | 'green';
}

function renderTabIcon(icon: TabItem['icon'], size: number = 18) {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return icon;
  }
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))
  ) {
    const IconComp = icon as React.ComponentType<{ size?: number }>;
    return <IconComp size={size} />;
  }
  return icon as React.ReactNode;
}

export default function SaoTabs({ tabs, activeTab, onChange, urlParamKey }: SaoTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!urlParamKey || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get(urlParamKey);
    if (tabFromUrl && tabs.some(t => t.id === tabFromUrl) && tabFromUrl !== activeTab) {
      onChange(tabFromUrl);
    }
  }, [urlParamKey]);

  // Đóng dropdown trên mobile khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMobileOpen(false);
      }
    }
    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileOpen]);

  const handleTabClick = (tabId: string) => {
    onChange(tabId);
    if (urlParamKey && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set(urlParamKey, tabId);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const activeTabObj = tabs.find(t => t.id === activeTab) || tabs[0] || { id: activeTab, label: activeTab };
  const activeIndex = Math.max(1, tabs.findIndex(t => t.id === activeTab) + 1);

  return (
    <>
      {/* 1. GIAO DIỆN DESKTOP / LAPTOP (> 768px): CONSOLE CHASSIS VÁT GÓC ĐẲNG CẤP */}
      <div ref={containerRef} className={styles.tabsContainer} role="tablist">
        <div className={styles.consoleLeftAccent} aria-hidden="true">
          <span className={styles.consoleLeftDiamond} />
          <span className={styles.consoleLeftLine} />
        </div>

        <div className={styles.tabList}>
          {tabs.map(tab => {
            const renderedIcon = renderTabIcon(tab.icon, 18);
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`${styles.tabBtn} ${isActive ? styles.active : ''}`}
                onClick={() => handleTabClick(tab.id)}
              >
                {renderedIcon && <span className={styles.iconWrapper}>{renderedIcon}</span>}
                <span className={styles.tabLabel}>{tab.label}</span>

                {/* Các chi tiết hiệu ứng khi Tab ở trạng thái Active */}
                {isActive && (
                  <>
                    <span className={styles.activeTopLine} aria-hidden="true" />
                    <span className={styles.activeBottomDiamond} aria-hidden="true" />
                    <span className={styles.activeSweep} aria-hidden="true" />
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Phụ kiện HUD cơ khí góc phải Console: 3 vạch telemetry /// */}
        <div className={styles.consoleRightAccent} aria-hidden="true">
          <span className={styles.consoleStripes} />
          <span className={styles.consoleRightDiamond} />
        </div>

        {/* Đường ray quang học chạy dọc đáy Console */}
        <div className={styles.bottomRail} aria-hidden="true" />
      </div>

      {/* 2. GIAO DIỆN MOBILE (<= 768px): SAO MOBILE HUD TAB SELECTOR */}
      <div className={styles.mobileSelectorWrapper} ref={dropdownRef}>
        <button
          type="button"
          className={`${styles.mobileSelectorBtn} ${isMobileOpen ? styles.mobileSelectorOpen : ''}`}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-expanded={isMobileOpen}
        >
          <div className={styles.mobileSelectorLeft}>
            <div className={styles.mobileActiveIcon}>
              {renderTabIcon(activeTabObj.icon, 18)}
            </div>
            <div className={styles.mobileActiveInfo}>
              <span className={styles.mobileActiveLabel}>{activeTabObj.label}</span>
              <span className={styles.mobileActiveSub}>
                MỤC {activeIndex} / {tabs.length}
              </span>
            </div>
          </div>

          <div className={styles.mobileSelectorRight}>
            <span className={styles.mobileSelectorTag}>CHUYỂN MỤC</span>
            <ChevronDown
              size={18}
              className={`${styles.mobileChevron} ${isMobileOpen ? styles.chevronRotated : ''}`}
            />
          </div>

          <div className={styles.mobileBottomGlowLine} aria-hidden="true" />
        </button>

        {isMobileOpen && (
          <div className={styles.mobileDropdownMenu}>
            <div className={styles.mobileDropdownHeader}>
              <Layers size={13} />
              <span>DANH MỤC ĐIỀU HƯỚNG</span>
            </div>
            <div className={styles.mobileDropdownList}>
              {tabs.map((tab, idx) => {
                const isCurrent = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`${styles.mobileDropdownItem} ${isCurrent ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      handleTabClick(tab.id);
                      setIsMobileOpen(false);
                    }}
                  >
                    <div className={styles.itemLeft}>
                      <div className={styles.itemIconWrapper}>
                        {renderTabIcon(tab.icon, 18)}
                      </div>
                      <span className={styles.itemLabel}>{tab.label}</span>
                    </div>
                    {isCurrent ? (
                      <span className={styles.activeCheckBadge}>
                        <Check size={14} />
                        <span>ĐANG CHỌN</span>
                      </span>
                    ) : (
                      <span className={styles.itemIndex}>0{idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
