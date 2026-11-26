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
import { I18nProvider, useI18n } from '../contexts/I18nContext';
import { getUserProfile } from './api';
import SaoAlert from '@/app/components/SaoAlert';
import YuiAssistant from '@/app/components/yui/YuiAssistant';
import SaoHeaderStatus from '@/app/components/layout/SaoHeaderStatus';
import styles from './layout.module.css';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [pathname]);

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
    { id: 'profile', path: '/profile', icon: Home, label: t('nav.profile') },
    { id: 'finance', path: '/finance', icon: Wallet, label: t('nav.finance') },
    { id: 'health', path: '/health', icon: Activity, label: t('nav.health') },
    { id: 'tasks', path: '/tasks', icon: CheckSquare, label: t('nav.tasks') },
    { id: 'calendar', path: '/calendar', icon: Calendar, label: t('nav.calendar') },
    { id: 'menu', path: '/menu', icon: Utensils, label: t('nav.menu') },
    { id: 'shopping', path: '/shopping', icon: ShoppingCart, label: t('nav.shopping') },
    { id: 'settings', path: '/settings', icon: Settings, label: t('nav.settings') },
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

  // Wallpaper and ambient HUD background management
  useEffect(() => {
    const applyWallpaper = () => {
      const savedBg = localStorage.getItem('sao-custom-bg');
      if (savedBg) {
        document.documentElement.style.setProperty('--sao-custom-bg', `url("${savedBg}")`);
      } else {
        document.documentElement.style.removeProperty('--sao-custom-bg');
      }

      const savedOverlay = localStorage.getItem('sao-bg-overlay');
      if (savedOverlay) {
        document.documentElement.style.setProperty('--sao-bg-overlay', `rgba(0, 15, 30, ${savedOverlay})`);
      } else {
        document.documentElement.style.removeProperty('--sao-bg-overlay');
      }
    };

    applyWallpaper();

    const handleWallpaperChange = () => {
      applyWallpaper();
    };

    window.addEventListener('sao-wallpaper-changed', handleWallpaperChange);
    return () => window.removeEventListener('sao-wallpaper-changed', handleWallpaperChange);
  }, []);

  if (isInitializing) {
    return (
      <div className={styles.saoLoaderContainer}>
        <div className={styles.saoLoaderSpinner}>
          <div className={styles.saoLoaderRing}></div>
          <div className={styles.saoLoaderRing2}></div>
        </div>
        <div className={styles.saoLoaderText}>{t('common.authenticating')}</div>
        <div className={styles.saoLoaderSubText}>{t('common.linkStart')}</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.topHeader}>
        <SaoHeaderStatus user={user} />
      </div>

      <div className={styles.dashboardLayout}>
        <div className={styles.sidebarContainer}>
          <div className={styles.sidebarLeftRail}>
            <div className={styles.railSpine}></div>
            <div className={styles.railPulse}></div>
            <div className={styles.railTopBracket}></div>
            <div className={styles.railTicks}>
              <span className={styles.railTick}></span>
              <span className={styles.railTick}></span>
              <span className={styles.railTick}></span>
              <span className={styles.railTick}></span>
            </div>
            <div className={styles.railBottomBracket}>
              <span className={styles.railDiamond}></span>
            </div>
          </div>

          {/* Khung xà mũ công nghệ góc trên (Cyber Canopy) */}
          <div className={styles.sidebarTopAccent}>
            <div className={styles.topAccentBar}></div>
            <div className={styles.topAccentCorner}></div>
            <div className={styles.topAccentNotches}>
              <span className={styles.topNotch}></span>
              <span className={styles.topNotch}></span>
            </div>
            <div className={styles.topAccentDiamond}></div>
          </div>

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

          {/* Đuôi khung đáy Sidebar (Cyber Keel vát đa tầng & viền liền mạch) */}
          <div className={styles.sidebarBottomAccent}>
            <div className={styles.bottomChassis}>
              <div className={styles.bottomChassisInner}>
                <div className={styles.bottomStripes}>
                  <span className={styles.bottomStripe}></span>
                  <span className={styles.bottomStripe}></span>
                  <span className={styles.bottomStripe}></span>
                </div>
              </div>
            </div>
            <div className={styles.bottomCornerDiamond}></div>
            <div className={styles.bottomTechLine}></div>
          </div>
        </div>

        <div className={styles.mainContent}>
          {children}
        </div>
      </div>

      <div className={styles.mobileNavWrapper}>
        {mobileMoreOpen && (
          <>
            <div
              className={styles.mobileDrawerBackdrop}
              onClick={() => setMobileMoreOpen(false)}
            />
            <div className={styles.mobileMoreDrawer}>
              <div className={styles.mobileMoreHeader}>
                <div className={styles.mobileMoreHeaderTitle}>
                  <LayoutGrid size={15} />
                  <span>{t('nav.more')}</span>
                </div>
                <button
                  type="button"
                  className={styles.mobileMoreClose}
                  onClick={() => setMobileMoreOpen(false)}
                  aria-label="Đóng bảng chức năng"
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
                      onClick={() => setMobileMoreOpen(false)}
                    >
                      <div className={styles.mobileMoreItemIcon}>
                        <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                      </div>
                      <span className={styles.mobileMoreItemLabel}>{item.label}</span>
                      {active && <span className={styles.mobileMoreItemActiveDot} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <nav className={styles.mobileBottomNav} aria-label="Điều hướng chính">
          <div className={styles.mobileBottomNavLaserRail} aria-hidden="true" />
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
                {active && <span className={styles.mobileNavActiveIndicator} aria-hidden="true" />}
              </Link>
            );
          })}
          <button
            type="button"
            className={`${styles.mobileNavItem} ${(mobileMoreOpen || isMobileSecondaryActive) ? styles.mobileNavItemActive : ''}`}
            onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
            aria-expanded={mobileMoreOpen}
            aria-label="Mở thêm chức năng"
          >
            <div className={styles.mobileMoreIconWrap}>
              {mobileMoreOpen ? <X size={20} strokeWidth={2.4} /> : <LayoutGrid size={20} strokeWidth={2.2} />}
              {isMobileSecondaryActive && !mobileMoreOpen && <span className={styles.mobileMoreDot} />}
            </div>
            <span>{t('nav.more')}</span>
            {(mobileMoreOpen || isMobileSecondaryActive) && (
              <span className={styles.mobileNavActiveIndicator} aria-hidden="true" />
            )}
          </button>
        </nav>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <AlertProvider>
        <DashboardContent>{children}</DashboardContent>
        {/* Render ngoài dashboardContainer để không bị kẹt dưới stacking context của topHeader (z-index: 20) */}
        <SaoAlert />
        <YuiAssistant />
      </AlertProvider>
    </I18nProvider>
  );
}
