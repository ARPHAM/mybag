"use client";

import { useState, useEffect } from 'react';
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
import styles from './profile.module.css';

export default function SciFiDashboard() {
  const [activeMenu, setActiveMenu] = useState('home');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { id: 'home', icon: Home, label: 'Trang chủ' },
    { id: 'finance', icon: Wallet, label: 'Tài chính' },
    { id: 'health', icon: Activity, label: 'Sức khoẻ' },
    { id: 'tasks', icon: CheckSquare, label: 'Nhiệm vụ' },
    { id: 'menu', icon: Utensils, label: 'Thực đơn' },
    { id: 'shopping', icon: ShoppingCart, label: 'Mua sắm' },
    { id: 'notes', icon: StickyNote, label: 'Ghi chú' },
    { id: 'stats', icon: BarChart, label: 'Thống kê' },
    { id: 'settings', icon: Settings, label: 'Cài đặt' },
  ];

  const formatDate = (date: Date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[date.getDay()]}, ${date.getDate()} Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardLayout}>

        {/* SIDEBAR */}
        <div className={styles.sidebarContainer}>
          {/* Trục ray bên trái */}
          <div className={styles.sidebarLeftRail}></div>
          <div className={styles.sidebarTopAccent}></div>

          <div className={styles.sidebarMenu}>
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`${styles.menuItem} ${activeMenu === item.id ? styles.active : ''}`}
                onClick={() => setActiveMenu(item.id)}
              >
                <div className={styles.menuItemInner}>
                  <div className={styles.menuIcon}>
                    <item.icon size={18} strokeWidth={2.5} />
                  </div>
                  <span className={styles.menuText}>{item.label}</span>
                </div>

                {/* Các mảnh ghép tạo viền phức tạp khi Active */}
                {activeMenu === item.id && (
                  <div className={styles.activeDecorators}>
                    <div className={styles.activeBorderTop}></div>
                    <div className={styles.activeBorderRight}></div>
                    <div className={styles.activeBorderBottom}></div>
                    <div className={styles.activeBorderLeft}></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Phần đuôi trang trí phức tạp của Sidebar */}
          <div className={styles.sidebarBottomAccent}>
            <div className={styles.bottomAngledCut}></div>
            <div className={styles.bottomTechLine}></div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className={styles.mainContent}>

          {/* HEADER */}
          <div className={styles.header}>
            <div className={styles.userInfo}>
              <div className={styles.avatarHex}></div>
              <div className={styles.userDetails}>
                <div className={styles.userName}>ARPHAM</div>
                <div className={styles.userLevel}>Level 42</div>
                <div className={styles.userQuote}>"Không phải tất cả hành trình đều cần phải nhanh, chỉ cần đừng dừng lại."</div>
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

            <div className={styles.dateTime}>
              <div className={styles.weatherRow}>
                <Sun size={18} color="#00f0ff" /> Today <Clock size={18} color="#00f0ff" style={{ marginLeft: 10 }} />
                <span className={styles.time}>{formatTime(currentTime)}</span>
              </div>
              <div className={styles.date}>{formatDate(currentTime)}</div>
            </div>
          </div>

          {/* DASHBOARD GRID */}
          <div className={styles.dashboardGrid}>

            {/* Thu Chi Widget */}
            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <Wallet className={styles.widgetIcon} size={20} />
                <span className={styles.widgetTitle}>Thu chi</span>
                <span className={styles.widgetSubtitle}>Quản lý tài chính cá nhân</span>
              </div>
              <div className={styles.emptyState}>
                <span>Widget Thu chi (Đang phát triển)</span>
              </div>
            </div>

            {/* Sức khoẻ Widget */}
            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <Activity className={styles.widgetIcon} size={20} />
                <span className={styles.widgetTitle}>Sức khoẻ</span>
                <span className={styles.widgetSubtitle}>Theo dõi chỉ số cơ bản</span>
              </div>
              <div className={styles.emptyState}>
                <span>Widget Sức khoẻ (Đang phát triển)</span>
              </div>
            </div>

            {/* Lịch hôm nay Widget */}
            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <Clock className={styles.widgetIcon} size={20} />
                <span className={styles.widgetTitle}>Lịch hôm nay</span>
                <span className={styles.widgetSubtitle}>{formatDate(currentTime)}</span>
              </div>
              <div className={styles.emptyState}>
                <span>Widget Lịch trình (Đang phát triển)</span>
              </div>
            </div>

            {/* Nhiệm vụ Widget */}
            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <CheckSquare className={styles.widgetIcon} size={20} />
                <span className={styles.widgetTitle}>Nhiệm vụ</span>
                <span className={styles.widgetSubtitle}>Những việc cần làm mỗi ngày</span>
              </div>
              <div className={styles.emptyState}>
                <span>Widget Nhiệm vụ (Đang phát triển)</span>
              </div>
            </div>

            {/* Thực đơn Widget */}
            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <Utensils className={styles.widgetIcon} size={20} />
                <span className={styles.widgetTitle}>Thực đơn</span>
                <span className={styles.widgetSubtitle}>Gợi ý & quản lý bữa ăn</span>
              </div>
              <div className={styles.emptyState}>
                <span>Widget Thực đơn (Đang phát triển)</span>
              </div>
            </div>

            {/* Mua sắm Widget */}
            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <ShoppingCart className={styles.widgetIcon} size={20} />
                <span className={styles.widgetTitle}>Mua sắm</span>
                <span className={styles.widgetSubtitle}>Danh sách cần mua</span>
              </div>
              <div className={styles.emptyState}>
                <span>Widget Mua sắm (Đang phát triển)</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
