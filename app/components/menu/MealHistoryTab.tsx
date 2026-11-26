"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { History, Plus, Loader2 } from 'lucide-react';
import SaoButton from '../SaoButton';
import SaoSearchInput from '../SaoSearchInput';
import SaoSelect from '../SaoSelect';
import MealCard from './MealCard';
import styles from '@/app/(main)/menu/menu.module.css';
import type { MealRecord, InventoryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface MealHistoryTabProps {
  meals: MealRecord[];
  inventory: InventoryItem[];
  formatMoney: (n: number) => string;
  onEditMeal: (meal: MealRecord) => void;
  onDeleteMeal: (id: string) => void;
  onRetryAI?: (meal: MealRecord) => void;
  onAddMeal: () => void;
  extractCleanManualNote: (meal: MealRecord) => string;
  toVnDateString: (dateInput?: string | Date) => string;
  days: '7' | '14' | '30' | 'all';
  search: string;
  onDaysChange: (days: '7' | '14' | '30' | 'all') => void;
  onSearchChange: (search: string) => void;
  isLoading?: boolean;
}

export default function MealHistoryTab({
  meals,
  inventory,
  formatMoney,
  onEditMeal,
  onDeleteMeal,
  onRetryAI,
  onAddMeal,
  extractCleanManualNote,
  toVnDateString,
  days,
  search,
  onDaysChange,
  onSearchChange,
  isLoading = false,
}: MealHistoryTabProps) {
  const { t } = useI18n();
  const [searchInput, setSearchInput] = useState(search);

  // Đồng bộ searchInput khi prop search từ ngoài thay đổi
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounce 350ms khi gõ tìm kiếm để tối ưu query BE
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        onSearchChange(searchInput);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, search, onSearchChange]);

  const daysFilterOptions = useMemo(() => [
    { value: '7', label: t('menu.recent7Days') },
    { value: '14', label: t('menu.recent14Days') },
    { value: '30', label: t('menu.recent30Days') },
    { value: 'all', label: t('menu.allHistory') },
  ], [t]);

  const groupedMeals = useMemo(() => {
    return meals.reduce((acc: Record<string, MealRecord[]>, meal) => {
      const dateKey = toVnDateString(meal.consumed_at);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(meal);
      return acc;
    }, {});
  }, [meals, toVnDateString]);

  const sortedDates = useMemo(() => {
    return Object.entries(groupedMeals).sort(
      ([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime()
    );
  }, [groupedMeals]);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Toolbar: Tìm kiếm món ăn & Bộ lọc thời gian (Mặc định 7 ngày gần nhất) */}
      <div className={styles.historyToolbar}>
        <div className={styles.historySearchWrapper}>
          <SaoSearchInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClear={() => {
              setSearchInput('');
              onSearchChange('');
            }}
            placeholder={t('menu.searchPlaceholder')}
          />
        </div>
        <div className={styles.historyFilterWrapper}>
          <SaoSelect
            value={days}
            onChange={(val) => onDaysChange(val as '7' | '14' | '30' | 'all')}
            options={daysFilterOptions}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: '#00f0ff', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={36} className="animate-spin" style={{ opacity: 0.8 }} />
          <div style={{ fontSize: '0.9rem', color: '#a0c4ff' }}>Đang nạp dữ liệu bữa ăn...</div>
        </div>
      ) : sortedDates.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '50px 20px' }}>
          <History size={48} style={{ opacity: 0.3, marginBottom: 12, display: 'inline-block' }} />
          <div>{search ? 'Không tìm thấy bữa ăn nào khớp với từ khóa.' : t('menu.emptyMeals')}</div>
          {!search && (
            <SaoButton
              variant="primary"
              onClick={onAddMeal}
              style={{ marginTop: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> {t('menu.firstMealPrompt')}
            </SaoButton>
          )}
        </div>
      ) : (
        <div className={styles.historyTimeline}>
          {sortedDates.map(([date, dayMeals]) => {
            // Tính tổng tiền tiêu hao trong ngày (bao gồm cả ăn ngoài & nguyên liệu kho khấu trừ)
            const dayTotalCost = dayMeals.reduce((sum, meal) => sum + (meal.cost || 0), 0);

            return (
              <div key={date} className={styles.timelineDay}>
                <div className={styles.timelineDateHeader}>
                  <div className={styles.timelineDate}>{date}</div>
                  <div className={styles.dayCostBadge}>
                    <span className={styles.dayCostLabel}>{t('menu.dailyCost')}:</span>
                    <span className={styles.dayCostValue}>{formatMoney(dayTotalCost)} đ</span>
                  </div>
                </div>

                <div className={styles.mealCards}>
                  {dayMeals.map((meal) => (
                    <MealCard
                      key={meal._id}
                      meal={meal}
                      inventory={inventory}
                      formatMoney={formatMoney}
                      cleanNote={extractCleanManualNote(meal)}
                      onEdit={onEditMeal}
                      onDelete={onDeleteMeal}
                      onRetryAI={onRetryAI}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
