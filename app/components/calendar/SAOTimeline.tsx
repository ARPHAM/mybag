"use client";

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import styles from './SAOTimeline.module.css';

interface SAOTimelineProps {
  events: any[];
  selectedDate?: Date;
  onEventClick?: (event: any) => void;
}

export default function SAOTimeline({ events, selectedDate, onEventClick }: SAOTimelineProps) {
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to earliest event or 07:00
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    let targetHour = 7;
    if (events && events.length > 0) {
      const earliestHour = Math.min(
        ...events.map((ev) => new Date(ev.start_time).getHours())
      );
      targetHour = Math.max(0, earliestHour - 1);
    }
    scrollContainerRef.current.scrollTop = targetHour * 60;
  }, [events]);

  // Live current time calculation
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isToday = useMemo(() => {
    if (!selectedDate) {
      return true; // Default show if not passed
    }
    const today = new Date();
    return (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    );
  }, [selectedDate]);

  // Process events for overlapping columns
  const processedEvents = useMemo(() => {
    if (!events || events.length === 0) return [];

    const sorted = [...events].sort((a, b) => {
      const startA = new Date(a.start_time).getTime();
      const startB = new Date(b.start_time).getTime();
      if (startA !== startB) return startA - startB;
      const endA = new Date(a.end_time).getTime();
      const endB = new Date(b.end_time).getTime();
      return endB - endA;
    });

    const clusters: any[][] = [];
    let currentCluster: any[] = [];
    let clusterEnd = 0;

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

    const result: any[] = [];
    clusters.forEach((cluster) => {
      const columns: any[][] = [];
      cluster.forEach((ev) => {
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

      const numCols = columns.length;
      columns.forEach((col, colIdx) => {
        col.forEach((ev) => {
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

  const getEventPosition = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

    const top = (startMinutes / 60) * 60; // 60px/hour = 1px/min
    const height = Math.max(26, ((endMinutes - startMinutes) / 60) * 60);

    return { top, height, startStr: formatTime(startDate), endStr: formatTime(endDate) };
  };

  const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div className={styles.timelineContainer}>
      {/* Chassis Corner Accents */}
      <div className={styles.bevelTL} aria-hidden="true" />
      <div className={styles.diamondTL} aria-hidden="true" />
      <div className={styles.bevelBR} aria-hidden="true" />
      <div className={styles.diamondBR} aria-hidden="true" />

      {/* 24-hour Scroll Area */}
      <div ref={scrollContainerRef} className={styles.scrollArea}>
        {/* Hour Grid Lines */}
        {hours.map((hour) => (
          <div key={hour} className={styles.hourRow}>
            <div className={styles.hourLabel}>
              {hour.toString().padStart(2, '0')}:00
            </div>
            <div className={styles.hourGridLine} />
          </div>
        ))}

        {/* Live Current Time Beam (if viewing today) */}
        {isToday && (
          <div
            className={styles.currentTimeBeam}
            style={{ top: `${currentMinutes}px` }}
          >
            <div className={styles.currentTimeDot} />
          </div>
        )}

        {/* Hologram Event Cards Layer */}
        <div className={styles.eventsLayer}>
          {processedEvents.map((ev, idx) => {
            const { top, height, startStr, endStr } = getEventPosition(ev.start_time, ev.end_time);
            const widthPct = 100 / ev._numCols;
            const leftPct = ev._colIdx * widthPct;

            // Resolve color: use custom color if available or default to SAO theme primary
            const baseColor = ev.color_code || 'var(--sao-primary-hex, #00f0ff)';
            const isHex = baseColor.startsWith('#');
            const bgGlow = isHex ? `${baseColor}26` : 'rgba(var(--sao-primary-rgb, 0, 240, 255), 0.18)';
            const borderGlow = isHex ? `${baseColor}66` : 'rgba(var(--sao-primary-rgb, 0, 240, 255), 0.45)';
            const shadowGlow = isHex ? `${baseColor}40` : 'rgba(var(--sao-primary-rgb, 0, 240, 255), 0.25)';

            return (
              <div
                key={ev._id || idx}
                onClick={() => onEventClick && onEventClick(ev)}
                className={styles.eventCard}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `calc(${leftPct}% + 8px)`,
                  width: `calc(${widthPct}% - 12px)`,
                  background: `linear-gradient(135deg, ${bgGlow} 0%, rgba(6, 18, 35, 0.88) 55%, ${bgGlow} 100%)`,
                  border: `1px solid ${borderGlow}`,
                  borderLeft: `3.5px solid ${baseColor}`,
                  boxShadow: `inset 0 0 16px ${bgGlow}, 0 2px 10px rgba(0, 0, 0, 0.45), 0 0 8px ${shadowGlow}`,
                }}
              >
                {/* Scanline hover reflection */}
                <div className={styles.scanline} aria-hidden="true" />

                <div className={styles.eventHeader}>
                  <span
                    className={styles.timeChip}
                    style={{
                      background: bgGlow,
                      color: baseColor,
                      borderColor: borderGlow,
                    }}
                  >
                    {startStr} - {endStr}
                  </span>

                  {ev.is_recurring && (
                    <span className={styles.repeatBadge}>
                      <RotateCcw size={10} />
                      <span>Lặp</span>
                    </span>
                  )}
                </div>

                <div className={styles.eventTitle}>{ev.title}</div>

                {ev.description && height >= 58 && (
                  <div className={styles.eventDesc}>{ev.description}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
