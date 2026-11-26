"use client";

import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './SaoModal.module.css';

export interface SaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function SaoModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  size = 'md',
  className = ''
}: SaoModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, mounted]);

  if (!isOpen || !mounted) return null;

  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`] || styles.sizeMd;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`${styles.modalContent} ${sizeClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.topLeftBevelLine} aria-hidden="true" />
        <div className={styles.bottomRightBevelLine} aria-hidden="true" />
        <div className={styles.bracketTL} aria-hidden="true">
          <div className={styles.bracketRivetTL} />
        </div>

        <div className={styles.bracketBR} aria-hidden="true">
          <div className={styles.bracketRivetBR} />
        </div>

        <div className={styles.bottomLaserBeam} aria-hidden="true" />

        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {icon && <span className={styles.titleIcon}>{icon}</span>}
            <span className={styles.titleText}>{title}</span>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Đóng popup"
            title="Đóng (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
