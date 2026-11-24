import React from 'react';
import styles from './SaoLoading.module.css';

interface SaoLoadingProps {
  text?: string;
  fullPage?: boolean;
}

export default function SaoLoading({ text = 'SYSTEM CONNECTING...', fullPage = false }: SaoLoadingProps) {
  return (
    <div className={`${styles.loadingContainer} ${fullPage ? styles.fullPage : ''}`}>
      <div className={styles.saoLoader}>
        <div className={styles.outerRing}></div>
        <div className={styles.innerRing}></div>
        <div className={styles.corePulse}></div>
      </div>
      {text && (
        <div className={styles.textContainer}>
          <div className={styles.textBracket}>[</div>
          <div className={styles.text}>{text}</div>
          <div className={styles.textBracket}>]</div>
        </div>
      )}
    </div>
  );
}
