"use client";

import React from 'react';
import {
  ChefHat, ShoppingBag, Edit3, Trash2, FileText,
  Flame, Beef, Droplet, Wheat, Candy, Sparkles,
  AlertCircle, RefreshCw
} from 'lucide-react';
import styles from './MealCard.module.css';
import type { MealRecord, InventoryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

export interface MealCardProps {
  meal: MealRecord;
  inventory?: InventoryItem[];
  formatMoney: (n: number) => string;
  cleanNote?: string;
  onEdit: (meal: MealRecord) => void;
  onDelete: (id: string) => void;
  onRetryAI?: (meal: MealRecord) => void;
}

export default function MealCard({
  meal,
  inventory = [],
  formatMoney,
  cleanNote,
  onEdit,
  onDelete,
  onRetryAI,
}: MealCardProps) {
  const { t, language } = useI18n();

  const accentColor = meal.source === 'eat_out' ? '#f5a623' : '#00f0ff';

  return (
    <div
      className={styles.card}
      style={{ '--card-accent': accentColor } as React.CSSProperties}
    >
      <span className={styles.leftAccentBar} aria-hidden="true" />
      <span className={styles.bevelTL} aria-hidden="true" />

      {/* Biểu tượng nguồn món ăn */}
      <div className={styles.iconBox}>
        {meal.source === 'eat_out' ? <ShoppingBag size={20} /> : <ChefHat size={20} />}
      </div>

      <div className={styles.content}>
        {/* Hàng tiêu đề & nút hành động */}
        <div className={styles.headerRow}>
          <div className={styles.foodName}>{meal.food_name}</div>
          <div className={styles.actionBtns}>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.editBtn}`}
              onClick={() => onEdit(meal)}
              title={t('common.edit')}
            >
              <Edit3 size={15} />
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.deleteBtn}`}
              onClick={() => onDelete(meal._id)}
              title={t('common.delete')}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Nguồn nấu & chi phí */}
        <div className={styles.metaRow}>
          <span className={`${styles.sourceTag} ${meal.source === 'eat_out' ? styles.sourceEatOut : styles.sourceHome}`}>
            {meal.source === 'eat_out' ? t('menu.eatOut') : t('menu.homeCook')}
          </span>
          {meal.cost !== undefined && meal.cost > 0 && (
            <span className={styles.costText} suppressHydrationWarning>
              • {meal.source === 'home' ? t('menu.pantryCost') : t('menu.cost')}: {meal.cost.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.currency')}
            </span>
          )}
        </div>

        {/* Danh sách nguyên liệu kho trừ */}
        {meal.source === 'home' && meal.ingredients_used && meal.ingredients_used.length > 0 && (
          <div className={styles.ingredientsList}>
            {meal.ingredients_used.map((ing, i) => {
              const invItem = inventory.find(item => item.id === ing.invId);
              const name = ing.name || invItem?.name || t('menu.pantryIngredient');
              const unit = ing.unit || invItem?.unit || '';
              const isDepletedNow = invItem ? invItem.quantity <= 0 : false;
              return (
                <span
                  key={`${ing.invId}-${i}`}
                  className={`${styles.ingChip} ${isDepletedNow ? styles.ingChipDepleted : ''}`}
                  title={isDepletedNow ? t('menu.itemDepleted') : undefined}
                >
                  {ing.qty} {unit} {name}
                  {ing.cost && ing.cost > 0 ? ` (-${formatMoney(ing.cost)}đ)` : ''}
                  {isDepletedNow ? ` • ${t('menu.depletedPantry')}` : ''}
                </span>
              );
            })}
          </div>
        )}

        {/* Ghi chú bóc tách */}
        {cleanNote && (
          <div className={styles.noteRow}>
            <FileText size={12} />
            <span>{t('common.notes')}: {cleanNote}</span>
          </div>
        )}

        {/* Chỉ số Macros dinh dưỡng */}
        {meal.ai_status === 'completed' && (
          <div className={styles.macrosRow}>
            <span className={`${styles.macroItem} ${styles.macroCalo}`} title="Calories">
              <Flame size={12} /> {meal.calo} Kcal
            </span>
            <span className={`${styles.macroItem} ${styles.macroProtein}`} title="Protein">
              <Beef size={12} /> {meal.protein}g
            </span>
            <span className={`${styles.macroItem} ${styles.macroFat}`} title="Fat">
              <Droplet size={12} /> {meal.fat}g
            </span>
            <span className={`${styles.macroItem} ${styles.macroCarbs}`} title="Carbs">
              <Wheat size={12} /> {meal.carbs}g
            </span>
            <span className={`${styles.macroItem} ${styles.macroSugar}`} title="Sugar">
              <Candy size={12} /> {meal.sugar}g
            </span>
          </div>
        )}

        {/* Mô tả AI */}
        {meal.ai_status === 'completed' && meal.ai_description && (
          <div className={styles.aiDesc}>
            <Sparkles size={12} style={{ display: 'inline', marginRight: 4, color: '#00f0ff' }} />
            {meal.ai_description}
          </div>
        )}

        {/* Trạng thái AI tính toán */}
        {meal.ai_status === 'pending' && (
          <div className={styles.aiPending}>
            <Sparkles size={12} /> {t('menu.aiCalculating')}
          </div>
        )}

        {/* Trạng thái AI lỗi */}
        {meal.ai_status === 'failed' && (
          <div className={styles.aiError}>
            <AlertCircle size={12} /> {t('menu.aiError')}
            {onRetryAI && (
              <button
                type="button"
                className={styles.retryBtn}
                onClick={() => onRetryAI(meal)}
              >
                <RefreshCw size={10} /> {t('menu.retry')}
              </button>
            )}
          </div>
        )}

        {/* Ghi chú chỉnh sửa tay */}
        {meal.edit_note && (
          <div className={styles.editNoteBadge}>
            <Edit3 size={11} /> {meal.edit_note}
          </div>
        )}
      </div>
    </div>
  );
}
