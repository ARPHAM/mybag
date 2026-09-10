"use client";

import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './SaoDatePicker.module.css';

interface SaoDatePickerProps {
  value?: string; // YYYY-MM-DD
  defaultValue?: string;
  onChange?: (date: string) => void;
  required?: boolean;
  name?: string;
}

export default function SaoDatePicker({ value, defaultValue, onChange, required, name }: SaoDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Uncontrolled vs Controlled support
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  const actualValue = value !== undefined ? value : internalValue;

  // Parse initial date or use today
  const initialDate = actualValue ? new Date(actualValue) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  return (
    <div className={styles.datePickerContainer} ref={containerRef}>
      {name && <input type="hidden" name={name} value={actualValue} />}
      <div className={styles.inputWrapper} onClick={() => setIsOpen(!isOpen)}>
        <input 
          type="text" 
          className={styles.dateInput} 
          value={formatDateDisplay(actualValue)} 
          readOnly 
          placeholder="DD/MM/YYYY"
          required={required}
        />
        <CalendarIcon size={18} className={styles.calendarIcon} />
      </div>

      {isOpen && (
        <div className={styles.calendarPopover}>
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
        </div>
      )}
    </div>
  );
}
