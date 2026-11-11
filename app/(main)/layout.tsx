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
  Settings,
  Calendar,
  LayoutGrid,
  X
} from 'lucide-react';
import { AlertProvider } from '../contexts/AlertContext';
import { getUserProfile } from './api';
import SaoAlert from '../components/SaoAlert/SaoAlert';
import YuiAssistant from '../components/YuiAssistant/YuiAssistant';
import SaoHeaderStatus from '../components/SaoHeaderStatus/SaoHeaderStatus';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [mobileMorePathname, setMobileMorePathname] = useState<string | null>(null);
  const mobileMoreOpen = mobileMorePathname === pathname;

  useEffect(() => {
    fetchUser();
    const handleUserUpdate = () => fetchUser(true);
    window.addEventListener('sao-user-updated', handleUserUpdate);
    return () => window.removeEventListener('sao-user-updated', handleUserUpdate);
  }, []);

  const fetchUser = async (force = false) => {
    try {
      const data: any = await getUserProfile(force);
      if (data.user) {
        setUser({ ...data.user, overdueCount: data.overdueCount || 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const menuItems = [
    { id: 'profile', path: '/profile', icon: Home, label: 'Hồ sơ' },
    { id: 'finance', path: '/finance', icon: Wallet, label: 'Tài chính' },
    { id: 'health', path: '/health', icon: Activity, label: 'Sức khoẻ' },
    { id: 'tasks', path: '/tasks', icon: CheckSquare, label: 'Nhiệm vụ' },
    { id: 'calendar', path: '/calendar', icon: Calendar, label: 'Lịch trình' },
    { id: 'menu', path: '/menu', icon: Utensils, label: 'Thực đơn' },
    { id: 'shopping', path: '/shopping', icon: ShoppingCart, label: 'Mua sắm' },
    { id: 'settings', path: '/settings', icon: Settings, label: 'Cài đặt' },
  ];

  const mobilePrimaryIds = new Set(['finance', 'tasks', 'calendar', 'menu']);
  const mobilePrimaryItems = menuItems.filter((item) => mobilePrimaryIds.has(item.id));
  const mobileSecondaryItems = menuItems.filter((item) => !mobilePrimaryIds.has(item.id));
  const isItemActive = (item: (typeof menuItems)[number]) =>
    pathname === item.path || (pathname === '/' && item.id === 'profile');
  const isMobileSecondaryActive = mobileSecondaryItems.some(isItemActive);

  const [themeColor, setThemeColor] = useState('cyan');

  useEffect(() => {
    const saved = localStorage.getItem('sao-theme');
    if (saved) setThemeColor(saved);

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

  useEffect(() => {
    const vars = getThemeVars();
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value);
    }
  }, [themeColor]);

  if (isInitializing) {
    return (
      <div className={styles.saoLoaderContainer}>
        <div className={styles.saoLoaderSpinner}>
          <div className={styles.saoLoaderRing}></div>
          <div className={styles.saoLoaderRing2}></div>
        </div>
        <div className={styles.saoLoaderText}>AUTHENTICATING...</div>
        <div className={styles.saoLoaderSubText}>LINK START</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.topHeader}>
        <div className={styles.topHeaderLine}></div>

        {/* SaoHeaderStatus runs its own 1-second timer; only IT re-renders each tick */}
        <SaoHeaderStatus user={user} />
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

        <div className={styles.mainContent}>
          <AlertProvider>
            {children}
            <SaoAlert />
            <YuiAssistant />
          </AlertProvider>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION & SECONDARY DRAWER */}
      <div className={styles.mobileNavWrapper}>
        {mobileMoreOpen && (
          <>
            <div
              className={styles.mobileDrawerBackdrop}
              onClick={() => setMobileMorePathname(null)}
              aria-hidden="true"
            />
            <div className={styles.mobileMoreDrawer} role="dialog" aria-label="Menu mở rộng">
              <div className={styles.mobileMoreHeader}>
                <span>SYSTEM MENU</span>
                <button
                  type="button"
                  className={styles.mobileMoreClose}
                  onClick={() => setMobileMorePathname(null)}
                  aria-label="Đóng menu"
                >
                  <X size={16} />
                </button>
              </div>
              <div className={styles.mobileMoreGrid}>
                {mobileSecondaryItems.map((item) => {
                  const active = isItemActive(item);
                  return (
                    <Link
                      key={item.id}
                      href={item.path}
                      className={`${styles.mobileMoreItem} ${active ? styles.mobileMoreItemActive : ''}`}
                      onClick={() => setMobileMorePathname(null)}
                    >
                      <item.icon size={20} strokeWidth={2.2} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <nav className={styles.mobileBottomNav} aria-label="Điều hướng chính">
          {mobilePrimaryItems.map((item) => {
            const active = isItemActive(item);
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`${styles.mobileNavItem} ${active ? styles.mobileNavItemActive : ''}`}
              >
                <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={`${styles.mobileNavItem} ${(mobileMoreOpen || isMobileSecondaryActive) ? styles.mobileNavItemActive : ''}`}
            onClick={() => setMobileMorePathname((prev) => (prev === pathname ? null : pathname))}
            aria-expanded={mobileMoreOpen}
            aria-label="Mở thêm chức năng"
          >
            <div className={styles.mobileMoreIconWrap}>
              {mobileMoreOpen ? <X size={20} strokeWidth={2.4} /> : <LayoutGrid size={20} strokeWidth={2.2} />}
              {isMobileSecondaryActive && !mobileMoreOpen && <span className={styles.mobileMoreDot} />}
            </div>
            <span>Thêm</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
