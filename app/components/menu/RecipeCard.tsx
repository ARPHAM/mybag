"use client";

import React from 'react';
import { Utensils, Edit3, Flame } from 'lucide-react';
import SaoButton from '../SaoButton';
import styles from './RecipeCard.module.css';
import type { Recipe } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

export interface RecipeCardProps {
  recipe: Recipe;
  onEdit?: (recipe: Recipe) => void;
  onCook: (recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, onEdit, onCook }: RecipeCardProps) {
  const { t } = useI18n();

  return (
    <div className={styles.card}>
      <span className={styles.leftAccentBar} aria-hidden="true" />
      <span className={styles.bevelTL} aria-hidden="true" />

      {/* Ảnh / Icon banner công thức */}
      <div className={styles.banner}>
        <Utensils size={52} strokeWidth={1.2} className={styles.bannerIcon} />
        {onEdit && (
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => onEdit(recipe)}
            title={t('common.edit')}
          >
            <Edit3 size={15} />
          </button>
        )}
      </div>

      {/* Nội dung công thức */}
      <div className={styles.content}>
        <div className={styles.recipeName}>{recipe.name}</div>

        {/* Nguyên liệu */}
        <div className={styles.ingredientsList}>
          {recipe.ingredients.map((ing, i) => (
            <span key={i} className={styles.ingredientTag}>
              {ing}
            </span>
          ))}
        </div>

        {/* Tóm tắt hướng dẫn nấu */}
        {recipe.instructions && (
          <div className={styles.instructions} title={recipe.instructions}>
            {recipe.instructions}
          </div>
        )}

        {/* Nút hành động Nấu món này */}
        <SaoButton
          variant="primary"
          className={styles.cookBtn}
          onClick={() => onCook(recipe)}
        >
          <Flame size={15} style={{ marginRight: 6 }} />
          {t('menu.cookThis')}
        </SaoButton>
      </div>
    </div>
  );
}
