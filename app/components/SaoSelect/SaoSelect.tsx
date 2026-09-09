"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './SaoSelect.module.css';

interface Option {
  value: string;
  label: string;
}

interface SaoSelectProps {
  options: Option[];
  initialValue?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
}

export default function SaoSelect({ options, initialValue, onChange, placeholder = 'Select...' }: SaoSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(initialValue);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    setSelectedValue(val);
    setIsOpen(false);
    if (onChange) onChange(val);
  };

  const selectedLabel = options.find(o => o.value === selectedValue)?.label || placeholder;

  return (
    <div className={styles.selectContainer} ref={containerRef}>
      <div 
        className={`${styles.selectTrigger} ${isOpen ? styles.isOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={18} className={`${styles.arrow} ${isOpen ? styles.isOpen : ''}`} />
      </div>
      
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {options.map(opt => (
            <div 
              key={opt.value}
              className={`${styles.option} ${opt.value === selectedValue ? styles.selected : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
