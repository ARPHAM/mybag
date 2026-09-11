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
  allowCustom?: boolean;
}

export default function SaoSelect({ options, initialValue, onChange, placeholder = 'Select...', allowCustom = false }: SaoSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(initialValue);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state if initialValue changes from outside
  useEffect(() => {
    setSelectedValue(initialValue);
  }, [initialValue]);

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

  const selectedLabel = options.find(o => o.value === selectedValue)?.label || (allowCustom ? selectedValue || '' : placeholder);

  return (
    <div className={styles.selectContainer} ref={containerRef}>
      <div 
        className={`${styles.selectTrigger} ${isOpen ? styles.isOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {allowCustom ? (
          <input 
            type="text" 
            className={styles.customInput} 
            value={selectedLabel} 
            onChange={handleInputChange} 
            placeholder={placeholder}
            onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
            style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '100%', fontSize: 'inherit', fontFamily: 'inherit' }}
          />
        ) : (
          <span>{selectedLabel}</span>
        )}
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
