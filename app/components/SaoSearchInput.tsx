"use client";

import React from 'react';
import { Search, X } from 'lucide-react';
import styles from './SaoSearchInput.module.css';

export interface SaoSearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function SaoSearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  onClear,
  className = '',
  autoFocus = false,
  disabled = false
}: SaoSearchInputProps) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      const event = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  };

  return (
    <div className={`${styles.searchWrapper} ${className}`}>
      <Search size={14} className={styles.searchIcon} aria-hidden="true" />
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        disabled={disabled}
      />
      {value.length > 0 && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={handleClear}
          aria-label="Xóa nội dung tìm kiếm"
          title="Xóa"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
