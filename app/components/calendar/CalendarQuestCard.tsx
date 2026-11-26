"use client";

import React from 'react';
import { Clock } from 'lucide-react';
import styles from './CalendarQuestCard.module.css';
import { useI18n } from '@/lib/i18n';

export interface CalendarQuestCardProps {
  task: any;
  onClick?: (task: any) => void;
  className?: string;
}

export default function CalendarQuestCard({
  task,
  onClick,
  className = ''
}: CalendarQuestCardProps) {
  const { t, language } = useI18n();

  const rank = task.quest_rank || 'C';
  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = task.status === 'OVERDUE' || (!isCompleted && new Date(task.due_date).getTime() < Date.now());

  const getTaskColor = () => {
    if (isCompleted) return '#00ffaa';
    if (isOverdue) return '#ff4444';
    switch (rank) {
      case 'S': return '#f59e0b';
      case 'A': return '#a855f7';
      case 'B': return '#00f0ff';
      case 'C': return '#00ffaa';
      case 'D': return '#94a3b8';
      default: return 'var(--sao-primary-hex, #00f0ff)';
    }
  };

  const dueTimeStr = task.due_date
    ? new Date(task.due_date).toLocaleTimeString(
        language === 'en' ? 'en-US' : 'vi-VN',
        { hour: '2-digit', minute: '2-digit' }
      )
    : '';

  const taskColor = getTaskColor();

  return (
    <div
      className={`
        ${styles.card} 
        ${isCompleted ? styles.completed : ''} 
        ${isOverdue ? styles.overdue : ''} 
        ${className}
      `}
      style={{ '--quest-color': taskColor } as React.CSSProperties}
      onClick={() => onClick && onClick(task)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick(task);
        }
      }}
    >
      {/* Trục năng lượng quang học mép trái */}
      <div className={styles.leftAccentBar} />

      {/* Vạch vát góc trên trái */}
      <div className={styles.topLeftBevel} aria-hidden="true" />

      {/* Hàng 1: Rank Badge + Status Badge */}
      <div className={styles.headerRow}>
        <span className={`${styles.rankBadge} ${styles[`rank_${rank}`]}`}>
          « RANK {rank} »
        </span>

        <span
          className={`
            ${styles.statusBadge}
            ${isCompleted ? styles.statusCompleted : isOverdue ? styles.statusOverdue : styles.statusPending}
          `}
        >
          {isCompleted
            ? t('tasks.completed').toUpperCase()
            : isOverdue
              ? t('tasks.overdue').toUpperCase()
              : t('tasks.pending').toUpperCase()
          }
        </span>
      </div>

      {/* Hàng 2: Tiêu đề */}
      <h4 className={`${styles.title} ${isCompleted ? styles.titleCompleted : ''}`}>
        {task.title}
      </h4>

      {/* Hàng 3: Mô tả (nếu có) */}
      {task.description && (
        <p className={styles.description}>
          {task.description}
        </p>
      )}

      {/* Hàng 4: Thời gian hạn chót */}
      {dueTimeStr && (
        <div className={styles.duePill}>
          <Clock size={12} />
          <span>{dueTimeStr}</span>
        </div>
      )}
    </div>
  );
}
