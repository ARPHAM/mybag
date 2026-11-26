"use client";

import React from 'react';
import { Check } from 'lucide-react';
import styles from './MenuModals.module.css';

interface CyberCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function CyberCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
  className = ''
}: CyberCheckboxProps) {
  return (
    <label className={`${styles.checkboxLabel} ${className}`} style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <input
        type="checkbox"
        className={styles.checkboxInput}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.checkboxBox}>
        <Check size={14} strokeWidth={3} />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
