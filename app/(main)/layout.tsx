"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Wallet,
  Activity,
  CheckSquare,
  Utensils,
  ShoppingCart,
  StickyNote,
  BarChart,
  Settings,
  Plus,
  Shield,
  Sun,
  Clock
} from 'lucide-react';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { id: 'profile', path: '/profile', icon: Home, label: 'Trang chủ' },
    { id: 'finance', path: '/finance', icon: Wallet, label: 'Tài chính' },
    { id: 'health', path: '/health', icon: Activity, label: 'Sức khoẻ' },
    { id: 'tasks', path: '/tasks', icon: CheckSquare, label: 'Nhiệm vụ' },
    { id: 'menu', path: '/menu', icon: Utensils, label: 'Thực đơn' },
    { id: 'shopping', path: '/shopping', icon: ShoppingCart, label: 'Mua sắm' },
    { id: 'settings', path: '/settings', icon: Settings, label: 'Cài đặt' },
  ];

  const [themeColor, setThemeColor] = useState('cyan');

  useEffect(() => {
    const saved = localStorage.getItem('sao-theme');
    if (saved) setThemeColor(saved);
    
    // Custom Event listener for when settings page changes the theme
    const handleThemeChange = (e: any) => {
      if (e.detail) setThemeColor(e.detail);
    };
    window.addEventListener('sao-theme-changed', handleThemeChange);
    return () => window.removeEventListener('sao-theme-changed', handleThemeChange);
  }, []);

  const getThemeVars = () => {
    switch (themeColor) {
      case 'yellow': return { '--sao-primary-hex': '#ffaa00', '--sao-primary-rgb': '255, 170, 0' };
      case 'red': return { '--sao-primary-hex': '#ff4444', '--sao-primary-rgb': '255, 68, 68' };
      case 'green': return { '--sao-primary-hex': '#00ffaa', '--sao-primary-rgb': '0, 255, 170' };
      case 'purple': return { '--sao-primary-hex': '#b900ff', '--sao-primary-rgb': '185, 0, 255' };
      case 'magenta': return { '--sao-primary-hex': '#ff00ff', '--sao-primary-rgb': '255, 0, 255' };
      case 'orange': return { '--sao-primary-hex': '#ff5500', '--sao-primary-rgb': '255, 85, 0' };
      case 'white': return { '--sao-primary-hex': '#ffffff', '--sao-primary-rgb': '255, 255, 255' };
      default: return { '--sao-primary-hex': '#00f0ff', '--sao-primary-rgb': '0, 240, 255' };
    }
  };

  const formatDate = (date: Date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[date.getDay()]}, ${date.getDate()} Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.dashboardContainer} style={getThemeVars() as React.CSSProperties}>
      {/* GLOBAL HEADER (TOP) */}
      <div className={styles.topHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.userInfo}>
            <div className={styles.avatarHex}></div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>ARPHAM</div>
              <div className={styles.userLevel}>Level 42</div>
              <div className={styles.userQuote}>"Từng chút một, hướng tới phiên bản tốt hơn."</div>
            </div>

            <div className={styles.statusBars}>
              <div className={styles.barRow}>
                <div className={`${styles.barLabel} ${styles.hp}`}>
                  <Plus size={16} /> HP
                </div>
                <div className={styles.barWrapper}>
                  <div className={`${styles.barFill} ${styles.hp}`} style={{ width: '100%' }}></div>
                </div>
                <div className={styles.barValues}>315 / 315</div>
              </div>
              <div className={styles.barRow}>
                <div className={`${styles.barLabel} ${styles.mp}`}>
                  <Shield size={16} /> MP
                </div>
                <div className={styles.barWrapper}>
                  <div className={`${styles.barFill} ${styles.mp}`} style={{ width: '100%' }}></div>
                </div>
                <div className={styles.barValues}>7842 / 7842</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.dateTime}>
            <div className={styles.weatherRow}>
              <Sun size={18} color="#00f0ff" /> Today <Clock size={18} color="#00f0ff" style={{ marginLeft: 10 }} />
              <span className={styles.time}>{formatTime(currentTime)}</span>
            </div>
            <div className={styles.date}>{formatDate(currentTime)}</div>
          </div>
        </div>
      </div>

      <div className={styles.dashboardLayout}>
        {/* SIDEBAR */}
        <div className={styles.sidebarContainer}>
          <div className={styles.sidebarLeftRail}></div>
          <div className={styles.sidebarTopAccent}></div>

          <div className={styles.sidebarMenu}>
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (pathname === '/' && item.id === 'profile');
              
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className={styles.menuItemInner}>
                    <div className={styles.menuIcon}>
                      <item.icon size={18} strokeWidth={2.5} />
                    </div>
                    <span className={styles.menuText}>{item.label}</span>
                  </div>

                  {isActive && (
                    <div className={styles.activeDecorators}>
                      <div className={styles.activeBorderTop}></div>
                      <div className={styles.activeBorderRight}></div>
                      <div className={styles.activeBorderBottom}></div>
                      <div className={styles.activeBorderLeft}></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className={styles.sidebarBottomAccent}>
            <div className={styles.bottomAngledCut}></div>
            <div className={styles.bottomTechLine}></div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className={styles.mainContent}>

          {/* PAGE CONTENT */}
          {children}
        </div>
      </div>
    </div>
  );
}
