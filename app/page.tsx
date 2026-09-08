"use client";

import { useState } from 'react';
import styles from './page.module.css';

const COLORS = [
  { id: 'midnight', name: 'Midnight', hex: '#0f172a' },
  { id: 'emerald', name: 'Emerald', hex: '#059669' },
  { id: 'rose', name: 'Rose', hex: '#e11d48' },
  { id: 'amber', name: 'Amber', hex: '#d97706' },
  { id: 'indigo', name: 'Indigo', hex: '#4f46e5' },
  { id: 'violet', name: 'Violet', hex: '#7c3aed' },
];

export default function ColorSelectionPage() {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  return (
    <div 
      className={styles.container} 
      style={{ '--selected-color': selectedColor.hex } as React.CSSProperties}
    >
      <div className={styles.glassCard}>
        <h1 className={styles.title}>Lựa chọn màu sắc</h1>
        <p className={styles.subtitle}>
          Chọn một màu nền chủ đạo cho ứng dụng của bạn. Thiết kế sẽ tự động thích ứng với lựa chọn này.
        </p>

        <div className={styles.colorGrid}>
          {COLORS.map((color) => (
            <button
              key={color.id}
              className={`${styles.colorOption} ${selectedColor.id === color.id ? styles.active : ''}`}
              onClick={() => setSelectedColor(color)}
              aria-label={`Select ${color.name} color`}
            >
              <div className={styles.colorCircle} style={{ backgroundColor: color.hex }}>
                <svg 
                  className={styles.checkmark} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className={styles.colorName}>{color.name}</span>
            </button>
          ))}
        </div>

        <button className={styles.actionButton}>
          Xác nhận lựa chọn
        </button>
      </div>
    </div>
  );
}
