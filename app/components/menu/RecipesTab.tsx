"use client";

import React from 'react';
import { Utensils, Plus } from 'lucide-react';
import SaoButton from '../SaoButton';
import RecipeCard from './RecipeCard';
import styles from '@/app/(main)/menu/menu.module.css';
import type { Recipe } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface RecipesTabProps {
  recipes: Recipe[];
  onEditRecipe?: (recipe: Recipe) => void;
  onCookRecipe: (recipe: Recipe) => void;
  onAddRecipe: () => void;
}

export default function RecipesTab({
  recipes,
  onEditRecipe,
  onCookRecipe,
  onAddRecipe,
}: RecipesTabProps) {
  const { t } = useI18n();

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className={styles.recipesGrid}>
        {recipes.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', gridColumn: '1 / -1', padding: '50px 20px' }}>
            <Utensils size={48} style={{ opacity: 0.3, marginBottom: 12, display: 'inline-block' }} />
            <div>{t('menu.emptyRecipes')}</div>
            <SaoButton
              variant="primary"
              onClick={onAddRecipe}
              style={{ marginTop: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> {t('menu.addRecipe')}
            </SaoButton>
          </div>
        ) : (
          recipes.map((recipe) => (
            <RecipeCard
              key={recipe._id}
              recipe={recipe}
              onEdit={onEditRecipe}
              onCook={onCookRecipe}
            />
          ))
        )}
      </div>
    </div>
  );
}
