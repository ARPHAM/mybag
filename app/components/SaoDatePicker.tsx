"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './SaoDatePicker.module.css';
import { useI18n } from '@/lib/i18n';

interface CustomTriggerProps {
  value: string;
  displayValue: string;
  isOpen: boolean;
  toggle: () => void;
}

interface SaoDatePickerProps {
  value?: string; // YYYY-MM-DD
  defaultValue?: string;
  onChange?: (date: string) => void;
  onClear?: () => void;
  clearable?: boolean;
  required?: boolean;
  name?: string;
  placeholder?: string;
  customTrigger?: (props: CustomTriggerProps) => React.ReactNode;
  className?: string;
}

export default function SaoDatePicker({
  value,
  defaultValue,
  onChange,
  onClear,
  clearable = false,
  required,
  name,
  placeholder = "DD/MM/YYYY",
  customTrigger,
  className
}: SaoDatePickerProps) {
  const { language } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);

  // Uncontrolled vs Controlled support
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  const actualValue = value !== undefined ? value : internalValue;

  useEffect(() => {
    setMounted(true);
  }, []);

  const parseDateString = (str: string): Date => {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // Parse initial date or use today
  const initialDate = parseDateString(actualValue);
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  // Sync internalValue and currentMonth when controlled value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
      const dt = parseDateString(value);
      setCurrentMonth(new Date(dt.getFullYear(), dt.getMonth(), 1));
    }
  }, [value]);

  // Tính toán vị trí hiển thị popover thông minh, tự động lật lên trên nếu chạm đáy màn hình/popup
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverHeight = 310;
    const popoverWidth = 280;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    const top = openUpward
      ? Math.max(10, rect.top - popoverHeight - 6)
      : Math.min(window.innerHeight - popoverHeight - 10, rect.bottom + 6);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popoverWidth - 10);
    }

    setPopoverCoords({ top, left });
  }, []);

  // Lắng nghe sự kiện scroll (capture) và resize để popover luôn dính chặt vào input
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleReposition = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  // Handle outside click / tap
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const formatDateDisplay = (isoString: string) => {
    if (!isoString) return '';
    const parts = isoString.split('-');
    if (parts.length !== 3) return isoString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert to Monday-start (0 = Monday, 6 = Sunday)
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    const days = [];
    
    // Previous month filler days
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: daysInPrevMonth - firstDay + i + 1, current: false, prev: true });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, current: true });
    }
    
    // Next month filler days (to complete 42 cells = 6 weeks)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, current: false, next: true });
    }
    
    return days;
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Format to YYYY-MM-DD
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    const newDateString = `${yyyy}-${mm}-${dd}`;
    
    setInternalValue(newDateString);
    if (onChange) onChange(newDateString);
    setIsOpen(false);
  };

  const daysGrid = generateCalendar();
  
  const today = new Date();
  const isToday = (day: number) => 
    today.getDate() === day && 
    today.getMonth() === currentMonth.getMonth() && 
    today.getFullYear() === currentMonth.getFullYear();

  const isSelected = (day: number) => {
    if (!actualValue) return false;
    const [y, m, d] = actualValue.split('-');
    return parseInt(d) === day && 
           parseInt(m) - 1 === currentMonth.getMonth() && 
           parseInt(y) === currentMonth.getFullYear();
  };

  const dayNames = language === 'en'
    ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const monthNames = language === 'en'
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  return (
    <div
      className={`${styles.datePickerContainer} ${customTrigger ? styles.customTriggerContainer : ''} ${className || ''}`}
      ref={containerRef}
    >
      {name && <input type="hidden" name={name} value={actualValue} />}
      {customTrigger ? (
        customTrigger({
          value: actualValue,
          displayValue: formatDateDisplay(actualValue),
          isOpen,
          toggle: handleToggle
        })
      ) : (
        <div className={styles.inputWrapper} onClick={handleToggle}>
          <input 
            type="text" 
            className={`${styles.dateInput} ${clearable ? styles.clearable : ''}`} 
            value={formatDateDisplay(actualValue)} 
            readOnly 
            placeholder={placeholder}
            required={required}
          />
          {clearable && actualValue && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={(e) => {
                e.stopPropagation();
                setInternalValue('');
                if (onChange) onChange('');
                if (onClear) onClear();
              }}
              title="Xóa ngày"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          )}
          <CalendarIcon size={16} className={styles.calendarIcon} />
        </div>
      )}

      {/* Render Popover qua React Portal ra document.body để không bao giờ bị overflow-hidden hay clip-path cắt cụt */}
      {isOpen && mounted && popoverCoords && createPortal(
        <div
          ref={popoverRef}
          className={styles.calendarPopover}
          style={{
            position: 'fixed',
            top: `${popoverCoords.top}px`,
            left: `${popoverCoords.left}px`,
            zIndex: 99999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.calendarHeader}>
            <button className={styles.navButton} onClick={handlePrevMonth} type="button">
              <ChevronLeft size={16} />
            </button>
            <div className={styles.currentMonth}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button className={styles.navButton} onClick={handleNextMonth} type="button">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className={styles.daysGrid}>
            {dayNames.map(name => (
              <div key={name} className={styles.dayName}>{name}</div>
            ))}
            
            {daysGrid.map((item, index) => {
              if (!item.current) {
                return <div key={`empty-${index}`} className={`${styles.dayCell} ${styles.empty}`}>{item.day}</div>;
              }
              
              const isSelectedDay = isSelected(item.day);
              const isTodayDay = isToday(item.day);
              
              return (
                <div 
                  key={`day-${item.day}`} 
                  className={`${styles.dayCell} ${isSelectedDay ? styles.selected : ''} ${isTodayDay ? styles.today : ''}`}
                  onClick={() => handleSelectDate(item.day)}
                >
                  {item.day}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
