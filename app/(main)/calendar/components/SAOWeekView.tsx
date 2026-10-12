"use client";

import React, { useMemo } from 'react';
import { Clock, ShieldAlert, Award } from 'lucide-react';

interface SAOWeekViewProps {
  selectedDate: Date;
  events: any[];
  tasks: any[];
  onSelectDate: (date: Date) => void;
  onEventClick: (event: any) => void;
  onTaskClick?: (task: any) => void;
}

const RANK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: 'rgba(255, 215, 0, 0.2)', text: '#ffd700', border: '#ffd700' },
  A: { bg: 'rgba(255, 68, 68, 0.2)', text: '#ff4444', border: '#ff4444' },
  B: { bg: 'rgba(192, 132, 252, 0.2)', text: '#c084fc', border: '#c084fc' },
  C: { bg: 'rgba(56, 189, 248, 0.2)', text: '#38bdf8', border: '#38bdf8' },
  D: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8', border: '#94a3b8' }
};

export default function SAOWeekView({
  selectedDate,
  events,
  tasks,
  onSelectDate,
  onEventClick,
  onTaskClick
}: SAOWeekViewProps) {
  // Get 7 days of the week containing selectedDate (Mon -> Sun)
  const weekDays = useMemo(() => {
    const current = new Date(selectedDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(current.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const today = new Date();

  return (
    <div className="h-full flex flex-col bg-zinc-900/90 border border-cyan-500/30 rounded-sm overflow-hidden font-mono shadow-[0_0_15px_rgba(0,0,0,0.5)]">
      {/* 7 Columns Grid */}
      <div className="grid grid-cols-7 flex-1 min-h-0 divide-x divide-zinc-800/80 overflow-y-auto custom-scrollbar">
        {weekDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentToday = isSameDay(day, today);
          const dateStr = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().split('T')[0];

          // Filter events on this day
          const dayEvents = events.filter(ev => {
            const evDate = new Date(ev.start_time).toISOString().split('T')[0];
            return evDate === dateStr;
          });

          // Filter tasks due on this day
          const dayTasks = tasks.filter(t => {
            if (!t.due_date) return false;
            const taskDate = new Date(t.due_date).toISOString().split('T')[0];
            return taskDate === dateStr;
          });

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(day)}
              className={`flex flex-col min-h-[350px] cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-cyan-950/25 ring-1 ring-inset ring-cyan-500/50'
                  : 'hover:bg-zinc-800/30'
              }`}
            >
              {/* Day Header */}
              <div className={`p-2 border-b flex flex-col items-center justify-center transition-colors ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-900/30'
                  : isCurrentToday
                    ? 'border-zinc-500 bg-zinc-800/50'
                    : 'border-zinc-800 bg-zinc-900/60'
              }`}>
                <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                  {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                </span>
                <span className={`text-base font-bold ${
                  isSelected ? 'text-[var(--sao-primary-hex)]' : isCurrentToday ? 'text-zinc-200' : 'text-zinc-400'
                }`}>
                  {day.getDate()}
                </span>
              </div>

              {/* Day Content (Events & Quests) */}
              <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                {/* Events list */}
                {dayEvents.map((ev, evIdx) => (
                  <div
                    key={ev._id || evIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className="p-1.5 rounded-sm border-l-2 bg-zinc-800/60 hover:bg-zinc-800 transition-all text-xs"
                    style={{
                      borderLeftColor: ev.color_code || 'var(--sao-primary-hex)',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div className="font-semibold text-zinc-200 truncate" title={ev.title}>
                      {ev.title}
                    </div>
                    <div className="text-[10px] text-cyan-400/80 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {new Date(ev.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}

                {/* Quests list */}
                {dayTasks.map((task, tIdx) => {
                  const rank = task.quest_rank || 'C';
                  const rankStyle = RANK_COLORS[rank] || RANK_COLORS.C;
                  return (
                    <div
                      key={task._id || tIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTaskClick) onTaskClick(task);
                      }}
                      className="p-1.5 rounded-sm border bg-zinc-900/80 hover:bg-zinc-800/80 transition-all text-xs"
                      style={{
                        borderColor: rankStyle.border,
                        boxShadow: `0 0 8px ${rankStyle.bg}`
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="px-1 py-0.2 text-[9px] font-bold rounded"
                          style={{ backgroundColor: rankStyle.bg, color: rankStyle.text }}
                        >
                          RANK {rank}
                        </span>
                        <span className="text-[9px] text-zinc-400">
                          {task.status === 'COMPLETED' ? '✓ Xong' : task.status === 'OVERDUE' ? '✕ Trễ' : 'Quest'}
                        </span>
                      </div>
                      <div className="font-semibold text-zinc-200 truncate mt-1" title={task.title}>
                        {task.title}
                      </div>
                    </div>
                  );
                })}

                {dayEvents.length === 0 && dayTasks.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[11px] text-zinc-600 italic">
                    Trống
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
