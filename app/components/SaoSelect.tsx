"use client";

import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import styles from './SaoSelect.module.css';

export interface Option {
  value: string;
  label: string;
}

export interface SaoSelectProps {
  options: Option[];
  initialValue?: string;
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}

export default function SaoSelect({
  options = [],
  initialValue,
  value,
  onChange,
  placeholder = 'Chọn...',
  allowCustom = false,
  disabled = false,
  className = '',
  icon
}: SaoSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value ?? initialValue);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(240, Math.max(40, options.length * 40 + 10));
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;

    if (openUpward) {
      setCoords({
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(120, Math.min(240, spaceAbove - 16))
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(120, Math.min(240, spaceBelow - 16))
      });
    }
  }, [options.length]);

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  // Sync state if value or initialValue changes from outside
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    } else if (initialValue !== undefined) {
      setSelectedValue(initialValue);
    }
  }, [value, initialValue]);

  const handleSelect = (val: string) => {
    setSelectedValue(val);
    setIsOpen(false);
    if (onChange) onChange(val);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedValue(val);
    if (onChange) onChange(val);
  };

  const selectedLabel =
    options.find((o) => o.value === selectedValue)?.label ||
    (allowCustom ? selectedValue || '' : placeholder);

  return (
    <div
      className={`${styles.selectContainer} ${className}`}
      ref={containerRef}
      style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    >
      <div
        className={`${styles.selectTrigger} ${isOpen ? styles.isOpen : ''} ${icon ? styles.hasLeftIcon : ''}`}
        onClick={toggleDropdown}
      >
        {icon && <span className={styles.leftIcon}>{icon}</span>}

        {allowCustom ? (
          <input
            type="text"
            className={styles.customInput}
            value={selectedLabel}
            onChange={handleInputChange}
            placeholder={placeholder}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOpen) toggleDropdown();
            }}
          />
        ) : (
          <span className={styles.labelText} title={selectedLabel}>{selectedLabel}</span>
        )}

        <ChevronDown
          size={14}
          className={`${styles.arrow} ${isOpen ? styles.isOpen : ''}`}
        />
      </div>

      {isOpen && mounted && coords && createPortal(
        <div
          ref={dropdownRef}
          className={styles.dropdownMenu}
          style={{
            position: 'fixed',
            ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
            ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`${styles.option} ${opt.value === selectedValue ? styles.selected : ''}`}
              onClick={() => handleSelect(opt.value)}
              title={opt.label}
            >
              {opt.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
