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
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;

    const calculatedWidth = Math.min(rect.width, window.innerWidth - 16);
    const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - calculatedWidth - 8));

    if (openUpward) {
      setCoords({
        bottom: Math.max(8, window.innerHeight - rect.top + 4),
        left: calculatedLeft,
        width: calculatedWidth,
        maxHeight: Math.max(100, Math.min(240, spaceAbove - 16))
      });
    } else {
      setCoords({
        top: Math.max(8, rect.bottom + 4),
        left: calculatedLeft,
        width: calculatedWidth,
        maxHeight: Math.max(100, Math.min(240, spaceBelow - 16))
      });
    }
  }, []);

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

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
          className={`${styles.dropdownMenu} ${coords.bottom !== undefined ? styles.openUpward : ''}`}
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : 'auto',
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {options.length === 0 ? (
            <div className={styles.option} style={{ opacity: 0.6, cursor: 'default' }}>
              {placeholder}
            </div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.value}
                className={`${styles.option} ${opt.value === selectedValue ? styles.selected : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
                title={opt.label}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
