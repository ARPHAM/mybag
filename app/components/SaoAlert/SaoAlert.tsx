"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSaoAlert } from '../../contexts/AlertContext';
import { AlertCircle, HelpCircle } from 'lucide-react';
import styles from './SaoAlert.module.css';

export default function SaoAlert() {
  const { alertState, closeAlert } = useSaoAlert();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !alertState.isOpen) return null;

  const isError = alertState.type === 'alert' && (alertState.message.toLowerCase().includes('lỗi') || alertState.message.toLowerCase().includes('error'));
  const isDestructive = alertState.type === 'confirm' && alertState.message.toLowerCase().includes('xóa');

  const handleConfirm = () => {
    if (alertState.onConfirm) alertState.onConfirm();
    closeAlert();
  };

  const handleCancel = () => {
    if (alertState.onCancel) alertState.onCancel();
    closeAlert();
  };

  const content = (
    <div className={styles.alertOverlay}>
      <div className={`${styles.alertBox} ${isError ? styles.error : ''}`}>
        <div className={`${styles.iconContainer} ${isError ? styles.error : ''}`}>
          {alertState.type === 'confirm' ? (
            <HelpCircle size={48} />
          ) : (
            <AlertCircle size={48} />
          )}
        </div>
        
        <div className={styles.message}>
          {alertState.message.split('\\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i !== alertState.message.split('\\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>

        <div className={styles.buttonGroup}>
          {alertState.type === 'confirm' && (
            <button className={`${styles.btn} ${styles.btnCancel}`} onClick={handleCancel}>
              HỦY BỎ
            </button>
          )}
          <button 
            className={`${styles.btn} ${isDestructive ? styles.btnDestructive : styles.btnPrimary}`} 
            onClick={handleConfirm}
            autoFocus
          >
            {alertState.type === 'confirm' ? (isDestructive ? 'XÓA' : 'XÁC NHẬN') : 'ĐÃ HIỂU'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
