import React from 'react';
import styles from './SaoButton.module.css';

type ButtonVariant = 'primary' | 'danger' | 'default' | 'dashed' | 'ghost';

interface SaoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  ghostType?: 'default' | 'danger'; // Used only when variant === 'ghost'
}

export default function SaoButton({ 
  variant = 'primary', 
  ghostType = 'default',
  className = '', 
  children, 
  ...props 
}: SaoButtonProps) {
  
  // Xây dựng class động dựa vào variant
  let variantClass = styles.primary;
  if (variant === 'danger') variantClass = styles.danger;
  if (variant === 'default') variantClass = styles.default;
  if (variant === 'dashed') variantClass = styles.dashed;
  if (variant === 'ghost') {
    variantClass = `${styles.ghost} ${ghostType === 'danger' ? styles.dangerGhost : ''}`;
  }

  return (
    <button
      className={`${styles.btn} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
