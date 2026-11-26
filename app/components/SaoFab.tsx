"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import SaoButton, { ButtonVariant } from './SaoButton';
import styles from './SaoFab.module.css';

export interface SaoFabProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon?: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  variant?: ButtonVariant;
  position?: 'absolute' | 'fixed';
  className?: string;
  style?: React.CSSProperties;
}

export default function SaoFab({
  onClick,
  icon,
  title,
  ariaLabel,
  variant = 'primary',
  position = 'absolute',
  className = '',
  style
}: SaoFabProps) {
  return (
    <SaoButton
      type="button"
      variant={variant}
      shape="round"
      className={`${styles.fab} ${styles[position]} ${className}`}
      title={title}
      aria-label={ariaLabel || title}
      onClick={onClick}
      style={style}
    >
      {icon || <Plus size={26} strokeWidth={2.5} />}
    </SaoButton>
  );
}
