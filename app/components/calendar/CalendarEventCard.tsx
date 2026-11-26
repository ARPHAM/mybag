"use client";

import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import styles from './CalendarEventCard.module.css';
import { useI18n } from '@/lib/i18n';

export interface CalendarEventCardProps {
  event: any;
  onClick: (event: any) => void;
  className?: string;
}

export default function CalendarEventCard({
  event,
  onClick,
  className = ''
}: CalendarEventCardProps) {
  const { t, language } = useI18n();

  const actualColor = (event.color_code && event.color_code !== '#f97316')
    ? event.color_code
    : 'var(--sao-primary-hex, #00f0ff)';

  const startTimeStr = new Date(event.start_time).toLocaleTimeString(
    language === 'en' ? 'en-US' : 'vi-VN',
    { hour: '2-digit', minute: '2-digit' }
  );

  const endTimeStr = new Date(event.end_time).toLocaleTimeString(
    language === 'en' ? 'en-US' : 'vi-VN',
    { hour: '2-digit', minute: '2-digit' }
  );

  return (
    <div
      className={`${styles.card} ${className}`}
      style={{ '--event-color': actualColor } as React.CSSProperties}
      onClick={() => onClick(event)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(event);
        }
      }}
    >
      {/* Trục quang học mép trái */}
      <div className={styles.leftAccentBar} />

      {/* Vạch vát góc trên trái */}
      <div className={styles.topLeftBevel} aria-hidden="true" />

      {/* Hàng 1: Tiêu đề + Badge lặp lại */}
      <div className={styles.headerRow}>
        <h4 className={styles.title}>
          {event.title}
        </h4>
        {event.is_virtual && (
          <span className={styles.recurringBadge} title={t('calendar.recurring')}>
            <RotateCcw size={10} />
            {t('calendar.recurring')}
          </span>
        )}
      </div>

      {/* Hàng 2: Mô tả (nếu có) */}
      {event.description && (
        <p className={styles.description}>
          {event.description}
        </p>
      )}

      {/* Hàng 3: Thời gian sự kiện */}
      <div className={styles.timePill}>
        <Clock size={12} />
        <span>{startTimeStr} - {endTimeStr}</span>
      </div>
    </div>
  );
}
