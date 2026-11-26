"use client";

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import styles from './DateSelector.module.css';
import { useI18n } from '@/lib/i18n';

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export default function DateSelector({ selectedDate, onChange, className = '' }: DateSelectorProps) {
  const { t, language } = useI18n();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Giới hạn quá khứ ngắn: tối đa 30 ngày trước hôm nay
  const minPastDate = new Date(today);
  minPastDate.setDate(minPastDate.getDate() - 30);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isPastLimit = (date: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() <= minPastDate.getTime();
  };

  // Generate dynamic date strip around selectedDate (e.g. -3 to +14 days)
  const getDates = () => {
    const dates = [];
    for (let i = -3; i <= 14; i++) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() >= minPastDate.getTime()) {
        dates.push(d);
      }
    }
    return dates;
  };

  const dates = getDates();

  const handlePrev = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    newDate.setHours(0, 0, 0, 0);
    if (newDate.getTime() >= minPastDate.getTime()) {
      onChange(newDate);
    }
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(0, 0, 0, 0);
    onChange(newDate);
  };

  const handleToday = () => {
    onChange(new Date());
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [year, month, day] = e.target.value.split('-').map(Number);
      const pickedDate = new Date(year, month - 1, day);
      if (pickedDate.getTime() >= minPastDate.getTime()) {
        onChange(pickedDate);
      } else {
        onChange(new Date(minPastDate));
      }
    }
  };

  const isPrevDisabled = isPastLimit(selectedDate);
  const isViewingToday = isSameDay(selectedDate, today);

  const minDateStr = new Date(minPastDate.getTime() - minPastDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const currentDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Vạch ngàm cơ khí trang trí góc */}
      <div className={styles.topLeftBevel} aria-hidden="true" />
      <div className={styles.bottomRightBevel} aria-hidden="true" />

      {/* Cụm điều hướng (Lùi ngày, Hôm nay, Chọn lịch) */}
      <div className={styles.navCluster}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={isPrevDisabled}
          className={styles.navArrowBtn}
          title={isPrevDisabled ? t('calendar.pastLimit') : t('calendar.prevDay')}
          aria-label={t('calendar.prevDay')}
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          onClick={handleToday}
          className={`${styles.todayBtn} ${isViewingToday ? styles.todayActive : styles.todayInactive}`}
          title={t('calendar.today')}
        >
          <RotateCcw size={12} />
          <span>{t('calendar.today')}</span>
        </button>

        {/* Nút DatePicker nhảy đến ngày bất kỳ */}
        <div className="relative">
          <input
            ref={dateInputRef}
            type="date"
            min={minDateStr}
            value={currentDateStr}
            onChange={handlePickerChange}
            className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => {
              if (dateInputRef.current) {
                if ('showPicker' in HTMLInputElement.prototype) {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current.focus();
                }
              }
            }}
            className={styles.pickerBtn}
            title={t('calendar.selectDate')}
          >
            <CalendarIcon size={14} />
            <span className="hidden sm:inline">
              {selectedDate.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </button>
        </div>
      </div>

      {/* Dải ngày cuộn ngang */}
      <div className={styles.dateStrip}>
        {dates.map((date, idx) => {
          const selected = isSameDay(date, selectedDate);
          const isCurrentToday = isSameDay(date, today);

          let pillClass = styles.datePillNormal;
          if (selected) {
            pillClass = styles.datePillSelected;
          } else if (isCurrentToday) {
            pillClass = styles.datePillToday;
          }

          const dayOfWeekName = date.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', { weekday: 'short' });

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(date)}
              className={`${styles.datePill} ${pillClass}`}
            >
              <span className={styles.dayOfWeek}>
                {dayOfWeekName}
              </span>
              <span className={styles.dayNumber}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Nút Tiến 1 ngày */}
      <button
        type="button"
        onClick={handleNext}
        className={styles.navArrowBtn}
        title={t('calendar.nextDay')}
        aria-label={t('calendar.nextDay')}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
