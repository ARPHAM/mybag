import React from 'react';
import { ICalendarEvent } from '@/models/CalendarEvent';

interface SAOTimelineProps {
  events: any[]; // using any for now or cast to frontend type
  onEventClick?: (event: any) => void;
}

export default function SAOTimeline({ events, onEventClick }: SAOTimelineProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Process events for overlapping
  const processedEvents = React.useMemo(() => {
    if (!events || events.length === 0) return [];
    
    // Sort
    const sorted = [...events].sort((a, b) => {
      const startA = new Date(a.start_time).getTime();
      const startB = new Date(b.start_time).getTime();
      if (startA !== startB) return startA - startB;
      const endA = new Date(a.end_time).getTime();
      const endB = new Date(b.end_time).getTime();
      return endB - endA; // Longest first if same start
    });

    const clusters: any[][] = [];
    let currentCluster: any[] = [];
    let clusterEnd = 0;

    // 1. Group into clusters
    sorted.forEach((ev) => {
      const start = new Date(ev.start_time).getTime();
      const end = new Date(ev.end_time).getTime();
      
      if (currentCluster.length === 0) {
        currentCluster.push(ev);
        clusterEnd = end;
      } else if (start < clusterEnd) {
        currentCluster.push(ev);
        clusterEnd = Math.max(clusterEnd, end);
      } else {
        clusters.push(currentCluster);
        currentCluster = [ev];
        clusterEnd = end;
      }
    });
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // 2. Assign columns
    const result: any[] = [];
    clusters.forEach(cluster => {
      const columns: any[][] = [];
      cluster.forEach(ev => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lastEventInCol = col[col.length - 1];
          const lastEnd = new Date(lastEventInCol.end_time).getTime();
          const start = new Date(ev.start_time).getTime();
          
          if (start >= lastEnd) {
            col.push(ev);
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([ev]);
        }
      });

      // 3. Calculate dimensions for each event
      const numCols = columns.length;
      columns.forEach((col, colIdx) => {
        col.forEach(ev => {
          result.push({
            ...ev,
            _colIdx: colIdx,
            _numCols: numCols
          });
        });
      });
    });

    return result;
  }, [events]);

  // Helper to calculate top and height based on start and end times
  const getEventStyle = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    
    const top = (startMinutes / 60) * 60; // 60px per hour
    const height = ((endMinutes - startMinutes) / 60) * 60;

    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className="relative mt-4 bg-zinc-900/90 border border-zinc-700 rounded-sm font-mono text-zinc-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Grid container with vertical scroll */}
      <div className="h-[600px] overflow-y-auto relative custom-scrollbar">
        {/* Render hour lines */}
        {hours.map((hour) => (
          <div key={hour} className="flex border-b border-zinc-800/50 h-[60px] relative group">
            <div className="hour-label w-16 flex-shrink-0 text-right pr-4 py-2 text-xs text-zinc-500 transition-colors">
              {hour.toString().padStart(2, '0')}:00
            </div>
            <div className="flex-1 border-l border-zinc-800/50 relative"></div>
          </div>
        ))}

        {/* Render events */}
        <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none">
          {processedEvents.map((ev, idx) => {
            const style = getEventStyle(ev.start_time, ev.end_time);
            const actualColor = (ev.color_code && ev.color_code !== '#f97316') ? ev.color_code : null;
            
            // Calculate width and left based on cols
            const widthPct = 100 / ev._numCols;
            const leftPct = ev._colIdx * widthPct;
            
            return (
              <div 
                key={ev._id || idx}
                onClick={() => onEventClick && onEventClick(ev)}
                className="absolute rounded-sm border-l-4 p-2 pointer-events-auto shadow-md backdrop-blur-md transition-transform hover:scale-[1.01] hover:z-10 cursor-pointer overflow-hidden group"
                style={{
                  top: style.top,
                  height: style.height,
                  left: `calc(${leftPct}% + 10px)`,
                  width: `calc(${widthPct}% - 14px)`,
                  backgroundColor: actualColor ? `${actualColor}20` : 'rgba(var(--sao-primary-rgb), 0.2)',
                  borderColor: actualColor || 'var(--sao-primary-hex)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-y-full group-hover:animate-scanline pointer-events-none"></div>
                
                <div className="text-sm font-bold truncate text-white drop-shadow-md">
                  {ev.title}
                </div>
                {ev.description && (
                  <div className="text-xs opacity-80 whitespace-pre-wrap line-clamp-2 mt-1 leading-tight">
                    {ev.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Current Time Indicator (mocked for now, can make it dynamic later) */}
        {/* <div className="absolute left-16 right-0 border-t-2 border-red-500 shadow-[0_0_10px_red] z-20 pointer-events-none" style={{ top: '240px' }}>
          <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
        </div> */}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(24, 24, 27, 0.8);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--sao-primary-rgb), 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--sao-primary-rgb), 0.8);
        }
        .group:hover .hour-label {
          color: var(--sao-primary-hex);
        }
      `}</style>
    </div>
  );
}
