import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

export default function DateSelector({ selectedDate, onChange }: DateSelectorProps) {
  const getDates = () => {
    const dates = [];
    // From -3 days to +14 days
    for (let i = -3; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const dates = getDates();

  const handlePrev = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onChange(newDate);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  return (
    <div className="flex items-center gap-4 bg-zinc-800/80 border p-2 rounded-sm backdrop-blur-sm font-mono" style={{ borderColor: 'rgba(var(--sao-primary-rgb),0.5)', boxShadow: '0 0 10px rgba(var(--sao-primary-rgb),0.2)', color: 'var(--sao-primary-hex)' }}>
      <button onClick={handlePrev} className="p-1 rounded transition-colors" style={{ color: 'var(--sao-primary-hex)' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor='rgba(var(--sao-primary-rgb),0.2)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor='transparent'}>
        <ChevronLeft size={20} />
      </button>
      
      <div className="flex-1 flex items-center justify-start overflow-x-auto gap-2 hide-scrollbar py-1">
        {dates.map((date, idx) => {
          const selected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
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
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-lg">
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <button onClick={handleNext} className="p-1 rounded transition-colors" style={{ color: 'var(--sao-primary-hex)' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor='rgba(var(--sao-primary-rgb),0.2)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor='transparent'}>
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
