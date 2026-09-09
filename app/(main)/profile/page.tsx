"use client";

import {
  Wallet,
  Activity,
  CheckSquare,
  Utensils,
  ShoppingCart,
  Clock
} from 'lucide-react';
import styles from './profile.module.css';

export default function ProfileDashboard() {
  const currentTime = new Date();

  const formatDate = (date: Date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[date.getDay()]}, ${date.getDate()} Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  };

  return (
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
  );
}
