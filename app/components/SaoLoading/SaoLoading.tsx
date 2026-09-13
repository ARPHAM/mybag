import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './SaoLoading.module.css';

interface SaoLoadingProps {
  text?: string;
  fullPage?: boolean;
}

export default function SaoLoading({ text = 'Đang đồng bộ dữ liệu...', fullPage = false }: SaoLoadingProps) {
  return (
    <div className={`${styles.loadingContainer} ${fullPage ? styles.fullPage : ''}`}>
      <Loader2 className={styles.spinner} size={48} />
      {text && <div className={styles.text}>{text}</div>}
    </div>
  );
}
