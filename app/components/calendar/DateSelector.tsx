"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import styles from './DateSelector.module.css';
import { useI18n } from '@/lib/i18n';
import SaoDatePicker from '@/app/components/SaoDatePicker';

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  className?: string;
  viewMode?: 'day' | 'week' | 'month';
}

export default function DateSelector({ selectedDate, onChange, className = '', viewMode = 'day' }: DateSelectorProps) {
  const { t, language } = useI18n();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Giới hạn quá khứ (tối đa 1 năm trước hôm nay)
  const minPastDate = new Date(today);
  minPastDate.setDate(minPastDate.getDate() - 365);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isSameWeek = (d1: Date, d2: Date) => {
    const getMon = (d: Date) => {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
      m.setHours(0, 0, 0, 0);
      return m.getTime();
    };
    return getMon(d1) === getMon(d2);
  };

  const isPastLimit = (date: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() <= minPastDate.getTime();
  };

  // Generate dynamic strip around selectedDate based on viewMode
  const getDates = () => {
    if (viewMode === 'week') {
      // 7 ngày trong tuần được chọn (Thứ Hai -> Chủ Nhật)
      const day = selectedDate.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + diffToMonday + i);
        d.setHours(0, 0, 0, 0);
        days.push(d);
      }
      return days;
    }
    // Chế độ 'day': dải ngày động (-3 đến +14 ngày)
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
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    newDate.setHours(0, 0, 0, 0);
    if (newDate.getTime() >= minPastDate.getTime()) {
      onChange(newDate);
    }
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    newDate.setHours(0, 0, 0, 0);
    onChange(newDate);
  };

  const handleToday = () => {
    onChange(new Date());
  };

  const isPrevDisabled = isPastLimit(selectedDate);

  const isViewingCurrent = React.useMemo(() => {
    if (viewMode === 'week') return isSameWeek(selectedDate, today);
    if (viewMode === 'month') {
      return selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear();
    }
    return isSameDay(selectedDate, today);
  }, [selectedDate, today, viewMode]);

  const todayBtnText = viewMode === 'week' ? t('calendar.thisWeek') : viewMode === 'month' ? t('calendar.thisMonth') : t('calendar.today');
  const prevTitle = viewMode === 'week' ? t('calendar.prevWeek') : viewMode === 'month' ? t('calendar.prevMonth') : t('calendar.prevDay');
  const nextTitle = viewMode === 'week' ? t('calendar.nextWeek') : viewMode === 'month' ? t('calendar.nextMonth') : t('calendar.nextDay');

  const currentDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const pickerLabel = React.useMemo(() => {
    if (viewMode === 'month') {
      return language === 'en'
        ? selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : `Thg ${selectedDate.getMonth() + 1}, ${selectedDate.getFullYear()}`;
    }
    if (viewMode === 'week') {
      const day = selectedDate.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + diffToMonday);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
    }
    return selectedDate.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
      month: 'short',
      day: 'numeric'
    });
  }, [selectedDate, viewMode, language]);

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
          title={isPrevDisabled ? t('calendar.pastLimit') : prevTitle}
          aria-label={prevTitle}
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          onClick={handleToday}
          className={`${styles.todayBtn} ${isViewingCurrent ? styles.todayActive : styles.todayInactive}`}
          title={todayBtnText}
        >
          <RotateCcw size={12} />
          <span>{todayBtnText}</span>
        </button>

        {/* Nút DatePicker nhảy đến ngày bất kỳ chuẩn SAO Cyber HUD */}
        <SaoDatePicker
          className={styles.pickerContainer}
          value={currentDateStr}
          onChange={(dateStr) => {
            if (dateStr) {
              const [year, month, day] = dateStr.split('-').map(Number);
              const pickedDate = new Date(year, month - 1, day);
              if (pickedDate.getTime() >= minPastDate.getTime()) {
                onChange(pickedDate);
              } else {
                onChange(new Date(minPastDate));
              }
            }
          }}
          customTrigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className={styles.pickerBtn}
              title={t('calendar.selectDate')}
            >
              <CalendarIcon size={14} />
              <span className="hidden sm:inline">
                {pickerLabel}
              </span>
            </button>
          )}
        />
      </div>

      {/* Dải ngày / tháng cuộn ngang */}
      <div className={styles.dateStrip}>
        {viewMode === 'month' ? (
          Array.from({ length: 12 }, (_, m) => {
            const isSelected = selectedDate.getMonth() === m;
            const isCurrentMonth = today.getMonth() === m && today.getFullYear() === selectedDate.getFullYear();

            let pillClass = styles.datePillNormal;
            if (isSelected) {
              pillClass = styles.datePillSelected;
            } else if (isCurrentMonth) {
              pillClass = styles.datePillToday;
            }

            const monthNames = language === 'en'
              ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              : ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];

            return (
              <button
                key={m}
                type="button"
                onClick={() => onChange(new Date(selectedDate.getFullYear(), m, 1))}
                className={`${styles.datePill} ${pillClass}`}
              >
                <span className={styles.dayOfWeek}>
                  {selectedDate.getFullYear()}
                </span>
                <span className={styles.dayNumber}>
                  {monthNames[m]}
                </span>
              </button>
            );
          })
        ) : (
          dates.map((date, idx) => {
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
          })
        )}
      </div>

      {/* Nút Tiến */}
      <button
        type="button"
        onClick={handleNext}
        className={styles.navArrowBtn}
        title={nextTitle}
        aria-label={nextTitle}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
