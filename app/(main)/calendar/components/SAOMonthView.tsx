"use client";

import React, { useMemo } from 'react';

interface SAOMonthViewProps {
  selectedDate: Date;
  events: any[];
  tasks: any[];
  onSelectDate: (date: Date) => void;
  onEventClick: (event: any) => void;
  onSwitchToDayView?: () => void;
}

export default function SAOMonthView({
  selectedDate,
  events,
  tasks,
  onSelectDate,
  onEventClick,
  onSwitchToDayView
}: SAOMonthViewProps) {
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  // Generate 35-42 calendar days for current month grid (Monday start)
  const monthDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    let startDayOfWeek = firstDay.getDay(); // 0 is Sun, 1 is Mon
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // 0 is Mon, 6 is Sun

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Days in current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(currentYear, currentMonth, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Trailing days from next month to complete rows of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const today = new Date();
  const weekDayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="h-full flex flex-col bg-zinc-900/90 border border-cyan-500/30 rounded-sm overflow-hidden font-mono shadow-[0_0_15px_rgba(0,0,0,0.5)]">
      {/* Month Title Header */}
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--sao-primary-hex)] uppercase tracking-wider">
          Tháng {currentMonth + 1} / {currentYear}
        </span>
        {onSwitchToDayView && (
          <button
            onClick={onSwitchToDayView}
            className="text-xs text-cyan-400 hover:underline"
          >
            Chuyển xem theo ngày →
          </button>
        )}
      </div>

      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/80 text-center py-1.5 text-xs text-zinc-400 font-bold">
        {weekDayHeaders.map((header, i) => (
          <div key={i}>{header}</div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 flex-1 min-h-0 divide-x divide-y divide-zinc-800/60 overflow-y-auto custom-scrollbar">
        {monthDays.map(({ date, isCurrentMonth }, idx) => {
          const isSelected = isSameDay(date, selectedDate);
          const isCurrentToday = isSameDay(date, today);
          const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

          const dayEvents = events.filter(ev => {
            const evDate = new Date(ev.start_time).toISOString().split('T')[0];
            return evDate === dateStr;
          });

          const dayTasks = tasks.filter(t => {
            if (!t.due_date) return false;
            const taskDate = new Date(t.due_date).toISOString().split('T')[0];
            return taskDate === dateStr;
          });

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(date)}
              className={`p-1.5 min-h-[70px] lg:min-h-[90px] flex flex-col cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-cyan-950/30 ring-1 ring-inset ring-cyan-500/60'
                  : isCurrentMonth
                    ? 'hover:bg-zinc-800/40 bg-zinc-900/40'
                    : 'bg-zinc-950/40 opacity-40 hover:opacity-60'
              }`}
            >
              {/* Day Number & Indicators */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${
                  isSelected
                    ? 'text-[var(--sao-primary-hex)]'
                    : isCurrentToday
                      ? 'text-cyan-300 px-1 rounded bg-cyan-950/80 border border-cyan-500/40'
                      : isCurrentMonth
                        ? 'text-zinc-300'
                        : 'text-zinc-500'
                }`}>
                  {date.getDate()}
                </span>

                <div className="flex items-center gap-1">
                  {dayEvents.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--sao-primary-hex)]" title={`${dayEvents.length} sự kiện`} />
                  )}
                  {dayTasks.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${dayTasks.length} nhiệm vụ`} />
                  )}
                </div>
              </div>

              {/* Mini previews (up to 2 items) */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev, evIdx) => (
                  <div
                    key={ev._id || evIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className="text-[10px] px-1 py-0.5 rounded truncate bg-cyan-950/60 border-l border-cyan-400 text-zinc-300 hover:text-white"
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] text-zinc-500 italic pl-1">
                    +{dayEvents.length - 2} khác
                  </div>
                )}
                {dayEvents.length === 0 && dayTasks.length > 0 && (
                  <div className="text-[10px] px-1 py-0.5 rounded truncate bg-amber-950/40 border-l border-amber-400 text-amber-200">
                    {dayTasks[0].title}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
