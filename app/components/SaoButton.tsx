import React from 'react';
import styles from './SaoButton.module.css';

export type ButtonVariant = 'primary' | 'danger' | 'default' | 'dashed' | 'ghost';
export type ButtonShape = 'cyber' | 'default' | 'round';

export interface SaoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  ghostType?: 'default' | 'danger'; // Used only when variant === 'ghost'
  shape?: ButtonShape;
  active?: boolean;
}

export default function SaoButton({
  variant = 'primary',
  ghostType = 'default',
  shape,
  active,
  className = '',
  children,
  ...props
}: SaoButtonProps) {
  let variantClass = styles.primary;
  if (variant === 'danger') variantClass = styles.danger;
  if (variant === 'default') variantClass = styles.default;
  if (variant === 'dashed') variantClass = styles.dashed;
  if (variant === 'ghost') {
    variantClass = `${styles.ghost} ${ghostType === 'danger' ? styles.dangerGhost : ''}`;
  }

  let activeClass = '';
  if (active === true) {
    activeClass = styles.activeState;
  } else if (active === false) {
    activeClass = styles.unactiveState;
  }

  const isRound = shape === 'round' || className.includes('fab') || className.includes('Fab') || className.includes('round') || className.includes('Round');
  const isCyber = variant !== 'dashed' && !isRound && shape !== 'default';

  return (
    <button
      className={`${styles.btn} ${variantClass} ${activeClass} ${isCyber ? styles.cyber : ''} ${isRound ? styles.round : ''} ${className}`}
      {...props}
    >
      {isCyber && (
        <>
          <span className={styles.cornerNotchTL} aria-hidden="true" />
          <span className={styles.cornerNotchBR} aria-hidden="true" />
          <span className={styles.bevelTL} aria-hidden="true" />
          <span className={styles.bevelBR} aria-hidden="true" />
        </>
      )}
      <span className={styles.content}>{children}</span>
    </button>
  );
}
