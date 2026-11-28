"use client";

import React from 'react';
import { 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  Clock, 
  Flame, 
  Sparkles 
} from 'lucide-react';
import SaoButton from '../SaoButton';
import styles from './SaoTaskCard.module.css';
import type { Task } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

export interface SaoTaskCardProps {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (e: React.MouseEvent, task: Task) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  className?: string;
}

const RANK_EXP_MAP: Record<string, number> = {
  S: 1000,
  A: 600,
  B: 300,
  C: 150,
  D: 50
};

export default function SaoTaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  className = ''
}: SaoTaskCardProps) {
  const { t } = useI18n();

  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = task.status === 'OVERDUE' || (!isCompleted && new Date(task.due_date).getTime() < Date.now());

  // Determine dynamic task theme color
  const getTaskColor = () => {
    if (isCompleted) return '#00ffaa';
    if (isOverdue) return '#ff4444';
    switch (task.quest_rank) {
      case 'S': return '#f59e0b';
      case 'A': return '#a855f7';
      case 'B': return '#00f0ff';
      case 'C': return '#00ffaa';
      case 'D': return '#94a3b8';
      default: return 'var(--sao-primary-hex, #00f0ff)';
    }
  };

  const getDueInfo = (dueDateStr: string, status: string) => {
    if (status === 'COMPLETED') {
      return { type: 'completed', text: t('tasks.completed') };
    }

    const now = Date.now();
    const dueTime = new Date(dueDateStr).getTime();
    const diffMs = dueTime - now;

    if (diffMs < 0 || status === 'OVERDUE') {
      const pastHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
      const pastDays = Math.floor(pastHours / 24);
      const text = pastDays > 0 ? `Trễ ${pastDays} ngày` : `Trễ ${pastHours}h`;
      return { type: 'overdue', text };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      if (diffHours <= 2) {
        const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
        return { type: 'critical', text: `Khẩn cấp: ${diffMins} phút` };
      }
      return { type: 'warning', text: `Hôm nay (Còn ${diffHours}h)` };
    }

    if (diffDays === 1) {
      return { type: 'near', text: 'Ngày mai' };
    }

    return { type: 'normal', text: `Còn ${diffDays} ngày` };
  };

  const formatDueDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const dueInfo = getDueInfo(task.due_date, task.status);
  const taskColor = getTaskColor();

  return (
    <div
      className={`
        ${styles.card} 
        ${isCompleted ? styles.completed : ''} 
        ${isOverdue ? styles.overdueCard : ''}
        ${className}
      `}
      style={{ '--task-color': taskColor } as React.CSSProperties}
    >
      {/* Cột năng lượng quang học mép trái (Left Accent Spine) */}
      <div className={styles.leftAccentBar} />

      {/* Cụm ngàm cơ khí góc trên - trái (Top-Left Chassis Bracket) */}
      <div className={styles.cornerBracketTopLeft} aria-hidden="true">
        <div className={styles.topLeftBevelLine} />
        <div className={styles.bracketStripes} />
        <div className={styles.bracketDiamond} />
      </div>

      {/* Hàng 1: Checkbox HUD + Rank Badge (trái) và Cụm nút Thao tác (phải) */}
      <div className={styles.cardHeader}>
        <div className={styles.headerIdentity}>
          {/* Checkbox HUD Node */}
          <button
            type="button"
            className={`
              ${styles.checkbox} 
              ${isCompleted ? styles.checkboxCompleted : ''} 
              ${isOverdue ? styles.checkboxOverdue : ''}
            `}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task);
            }}
            aria-label={isCompleted ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
            title={isCompleted ? 'Hoàn tác nhiệm vụ' : 'Hoàn thành nhiệm vụ'}
          >
            {isCompleted && <Check size={16} className={styles.checkIcon} strokeWidth={3} />}
            {isOverdue && !isCompleted && <X size={15} className={styles.overdueIcon} strokeWidth={3} />}
          </button>

          {/* Rank Badge */}
          <span className={`${styles.rankBadge} ${styles[`rank_${task.quest_rank}`]}`}>
            « RANK {task.quest_rank} »
          </span>
        </div>

        {/* Cụm nút tương tác: Sửa & Xóa */}
        <div className={styles.taskActions}>
          <SaoButton
            variant="ghost"
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e, task);
            }}
            title={t('common.edit')}
          >
            <Edit2 size={14} />
          </SaoButton>
          <SaoButton
            variant="ghost"
            ghostType="danger"
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e, task._id);
            }}
            title={t('common.delete')}
          >
            <Trash2 size={14} />
          </SaoButton>
        </div>
      </div>

      {/* Hàng 2: Tiêu đề nhiệm vụ (Chiếm 100% bề ngang, không bị nút chèn ép) */}
      <div className={styles.taskBody}>
        <h4 className={`${styles.taskTitle} ${isCompleted ? styles.completedText : ''} ${isOverdue ? styles.overdueText : ''}`}>
          {task.title}
        </h4>

        {/* Mô tả chi tiết (nếu có) */}
        {task.description && (
          <p className={`${styles.taskDesc} ${isCompleted ? styles.completedDesc : ''}`}>
            {task.description}
          </p>
        )}
      </div>

      {/* Hàng 3: Hạn chót Telemetry (trái) & Phần thưởng EXP (phải) */}
      <div className={styles.cardFooter}>
        <span className={`${styles.dueBadge} ${styles[`due_${dueInfo.type}`]}`}>
          {dueInfo.type === 'critical' ? <Flame size={12} /> : <Clock size={12} />}
          <span>{dueInfo.text} • {formatDueDateTime(task.due_date)}</span>
        </span>

        <span className={styles.expChip}>
          <Sparkles size={11} /> +{RANK_EXP_MAP[task.quest_rank] || 50} EXP
        </span>
      </div>

      {/* Cụm ngàm cơ khí góc dưới - phải (Bottom-Right Chassis Bracket) */}
      <div className={styles.cornerBracketBottomRight} aria-hidden="true">
        <div className={styles.bottomRightBevelLine} />
        <div className={styles.bottomRightDiamond} />
      </div>
    </div>
  );
}
