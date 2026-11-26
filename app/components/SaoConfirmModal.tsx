"use client";

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import SaoModal from './SaoModal';
import SaoButton, { ButtonVariant } from './SaoButton';
import styles from './SaoConfirmModal.module.css';
import { useI18n } from '@/lib/i18n';

export interface SaoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string | React.ReactNode;
  subMessage?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ButtonVariant;
  confirmIcon?: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export default function SaoConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  subMessage,
  confirmText,
  cancelText,
  confirmVariant = 'danger',
  confirmIcon,
  icon,
  isLoading = false,
}: SaoConfirmModalProps) {
  const { t } = useI18n();

  const isDanger = confirmVariant === 'danger';
  const defaultTitle = title || (isDanger ? t('common.delete') : t('common.confirm'));
  const defaultConfirmText = confirmText || (isDanger ? t('common.delete') : t('common.confirm'));
  const defaultCancelText = cancelText || t('common.cancel');

  return (
    <SaoModal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultTitle}
      icon={icon || <AlertTriangle size={20} className={isDanger ? 'text-red-400' : 'text-amber-400'} />}
    >
      <div className={styles.confirmBox}>
        <div className={`${styles.iconWrapper} ${isDanger ? styles.dangerIconWrapper : styles.warningIconWrapper}`}>
          <AlertTriangle size={30} strokeWidth={2.3} />
        </div>

        <p className={styles.confirmMessage}>
          {message}
        </p>

        {subMessage && (
          <p className={styles.confirmSubMessage}>
            {subMessage}
          </p>
        )}
      </div>

      <div className={styles.modalFooter}>
        <SaoButton
          type="button"
          variant="default"
          onClick={onClose}
          disabled={isLoading}
        >
          {defaultCancelText}
        </SaoButton>

        <SaoButton
          type="button"
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {confirmIcon || (isDanger ? <Trash2 size={16} /> : null)}
          {isLoading ? '...' : defaultConfirmText}
        </SaoButton>
      </div>
    </SaoModal>
  );
}
