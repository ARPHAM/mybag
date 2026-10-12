import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

export default function DateSelector({ selectedDate, onChange }: DateSelectorProps) {
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
      // Chỉ lấy nếu >= minPastDate
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
    <div className="flex flex-wrap items-center gap-2 lg:gap-4 bg-zinc-800/80 border p-2 rounded-sm backdrop-blur-sm font-mono" style={{ borderColor: 'rgba(var(--sao-primary-rgb),0.5)', boxShadow: '0 0 10px rgba(var(--sao-primary-rgb),0.2)', color: 'var(--sao-primary-hex)' }}>
      {/* Navigation & Quick Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrev}
          disabled={isPrevDisabled}
          className="p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--sao-primary-hex)' }}
          title={isPrevDisabled ? "Đã chạm giới hạn lịch quá khứ (tối đa 30 ngày)" : "Ngày trước"}
          onMouseOver={(e) => { if (!isPrevDisabled) e.currentTarget.style.backgroundColor = 'rgba(var(--sao-primary-rgb),0.2)'; }}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ChevronLeft size={20} />
        </button>

        {!isViewingToday && (
          <button
            onClick={handleToday}
            className="px-2 py-1 text-xs rounded border border-cyan-500/40 hover:bg-cyan-500/20 transition-all flex items-center gap-1"
            style={{ color: 'var(--sao-primary-hex)' }}
            title="Quay về ngày hôm nay"
          >
            <RotateCcw size={12} /> Hôm nay
          </button>
        )}

        {/* Quick DatePicker to jump into any future date */}
        <div className="relative">
          <button
            onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
            className="p-1 rounded transition-colors hover:bg-cyan-500/20"
            style={{ color: 'var(--sao-primary-hex)' }}
            title="Nhảy nhanh đến ngày trong tương lai"
          >
            <CalendarIcon size={18} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            min={minDateStr}
            value={currentDateStr}
            onChange={handlePickerChange}
            className="absolute opacity-0 pointer-events-none w-0 h-0"
          />
        </div>
      </div>
      
      {/* Date Strip */}
      <div className="flex-1 flex items-center justify-start overflow-x-auto gap-2 hide-scrollbar py-1">
        {dates.map((date, idx) => {
          const selected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={idx}
              onClick={() => onChange(date)}
              className={`flex flex-col items-center min-w-[60px] p-2 border-b-2 transition-all ${
                selected 
                  ? 'font-bold' 
                  : isToday 
                    ? 'border-zinc-500 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300' 
                    : 'border-transparent hover:bg-zinc-700/50 text-zinc-400'
              }`}
              style={selected ? {
                borderColor: 'var(--sao-primary-hex)',
                backgroundColor: 'rgba(var(--sao-primary-rgb),0.2)',
                color: 'var(--sao-primary-hex)',
                boxShadow: 'inset 0 0 10px rgba(var(--sao-primary-rgb),0.3)'
              } : {}}
            >
              <span className="text-xs opacity-70 uppercase">
                {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
              </span>
              <span className="text-lg">
                {date.getDate()}
              </span>
              <span className="text-[10px] opacity-60">
                T{date.getMonth() + 1}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleNext}
        className="p-1 rounded transition-colors"
        style={{ color: 'var(--sao-primary-hex)' }}
        title="Ngày tiếp theo (nhảy vô tận vào tương lai)"
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--sao-primary-rgb),0.2)'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <ChevronRight size={20} />
      </button>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
