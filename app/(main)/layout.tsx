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
  Sun,
  Clock,
  Brain,
  Calendar
} from 'lucide-react';
import { AlertProvider } from '../contexts/AlertContext';
import { getUserProfile } from './api';
import SaoAlert from '../components/SaoAlert/SaoAlert';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());

      setUser((prevUser: any) => {
        if (!prevUser) return prevUser;
        const newHp = Math.max(0, prevUser.current_hp - (50 / 3600));

        let newMp = prevUser.current_mp;
        const overdue = prevUser.overdueCount || 0;
        if (overdue > 0) {
          newMp = Math.max(0, prevUser.current_mp - ((20 * overdue) / 3600));
        } else {
          newMp = Math.min(prevUser.max_mp || 500, prevUser.current_mp + (30 / 3600));
        }

        return {
          ...prevUser,
          current_hp: newHp,
          current_mp: newMp
        };
      });

    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const formatDate = (date: Date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[date.getDay()]}, ${date.getDate()} Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

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

        <div className={styles.headerLeftContainer}>

          <div className={styles.headerLeftTilted}>
            <div className={styles.avatarHex} style={user?.avatar_url ? { backgroundImage: `url(${user.avatar_url})` } : {}}></div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user ? user.username : 'GUEST'}</div>
              <div className={styles.userLevel}>Level {user ? user.level : 1}</div>
            </div>
          </div>

          <div className={styles.headerLeftFlat}>
            <div className={styles.statusBars}>
              <div className={styles.barRow} title="Năng lượng (HP)">
                <div className={`${styles.barLabel} ${styles.hp}`}>
                  <Utensils size={16} /> HP
                </div>
                <div className={styles.barWrapper}>
                  <div className={`${styles.barFill} ${styles.hp}`} style={{ width: user ? `${(user.current_hp / user.max_hp) * 100}%` : '100%' }}></div>
                </div>
                <div className={styles.barValues}>{user ? `${Math.floor(user.current_hp)} / ${user.max_hp}` : '0 / 0'}</div>
              </div>
              <div className={styles.barRow} title="Tinh thần (MP)">
                <div className={`${styles.barLabel} ${styles.mp}`}>
                  <Brain size={16} /> MP
                </div>
                <div className={styles.barWrapper}>
                  <div className={`${styles.barFill} ${styles.mp}`} style={{ width: user ? `${(user.current_mp / user.max_mp) * 100}%` : '100%' }}></div>
                </div>
                <div className={styles.barValues}>{user ? `${Math.floor(user.current_mp)} / ${user.max_mp}` : '0 / 0'}</div>
              </div>
            </div>
          </div>

        </div>

        <div className={styles.headerRight}>
          <div className={styles.hrDecorTop}></div>
          <div className={styles.hrDecorBottom}></div>
          <div className={styles.hrDecorLeft}></div>

          <div className={styles.dateTime}>
            <div className={styles.weatherRow}>
              <Sun size={18} color="#00f0ff" /> Today <Clock size={18} color="#00f0ff" style={{ marginLeft: 10 }} />
              <span className={styles.time} suppressHydrationWarning>{formatTime(currentTime)}</span>
            </div>
            <div className={styles.date} suppressHydrationWarning>{formatDate(currentTime)}</div>
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

        <div className={styles.mainContent}>
          <AlertProvider>
            {children}
            <SaoAlert />
          </AlertProvider>
        </div>
      </div>
    </div>
  );
}
