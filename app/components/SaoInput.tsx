import React from 'react';
import styles from './SaoInput.module.css';

interface SaoInputProps {
  isTextarea?: boolean;
  className?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  [key: string]: any;
}

export default function SaoInput({ isTextarea, className = '', ...props }: SaoInputProps) {
  if (isTextarea) {
    return (
      <textarea
        className={`${styles.textarea} ${className}`}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    );
  }

  return (
    <input
      className={`${styles.input} ${className}`}
      {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  );
}
