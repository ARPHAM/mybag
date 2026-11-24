"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { vi } from '@/lib/i18n/vi';
import { en } from '@/lib/i18n/en';

export type Language = 'vi' | 'en';

type Dictionaries = typeof vi;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
  formatDate: (date: Date | string | number) => string;
  formatTime: (date: Date | string | number) => string;
  formatMoney: (amount: number) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const dictionaries: Record<Language, any> = {
  vi,
  en,
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    const saved = localStorage.getItem('sao-lang') as Language;
    if (saved && (saved === 'vi' || saved === 'en')) {
      setLanguageState(saved);
    }

    const handleLangChange = (e: any) => {
      if (e.detail && (e.detail === 'vi' || e.detail === 'en')) {
        setLanguageState(e.detail);
      }
    };
    window.addEventListener('sao-language-changed', handleLangChange);
    return () => window.removeEventListener('sao-language-changed', handleLangChange);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sao-lang', lang);
    window.dispatchEvent(new CustomEvent('sao-language-changed', { detail: lang }));
  }, []);

  const t = useCallback(
    (keyPath: string, fallback?: string): string => {
      const keys = keyPath.split('.');
      let current: any = dictionaries[language];
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          // Fallback to Vietnamese if English key is missing, or return fallback/keyPath
          let viCurrent: any = dictionaries.vi;
          for (const vk of keys) {
            if (viCurrent && typeof viCurrent === 'object' && vk in viCurrent) {
              viCurrent = viCurrent[vk];
            } else {
              return fallback || keyPath;
            }
          }
          return typeof viCurrent === 'string' ? viCurrent : fallback || keyPath;
        }
      }
      return typeof current === 'string' ? current : fallback || keyPath;
    },
    [language]
  );

  const formatDate = useCallback(
    (dateInput: Date | string | number): string => {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      if (language === 'en') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      } else {
        const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        return `${days[d.getDay()]}, ${d.getDate()} Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
      }
    },
    [language]
  );

  const formatTime = useCallback(
    (dateInput: Date | string | number): string => {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [language]
  );

  const formatMoney = useCallback(
    (amount: number): string => {
      const formatted = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN').format(amount);
      return `${formatted} ${language === 'en' ? 'VND' : 'đ'}`;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      formatDate,
      formatTime,
      formatMoney,
    }),
    [language, setLanguage, t, formatDate, formatTime, formatMoney]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
