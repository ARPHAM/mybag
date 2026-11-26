"use client";

import React from 'react';
import { Save } from 'lucide-react';
import SaoInput from '@/app/components/SaoInput';
import SaoButton from '@/app/components/SaoButton';
import { useI18n } from '@/lib/i18n';
import styles from './MenuModals.module.css';

export interface RecipeModalProps {
  formName: string;
  setFormName: (val: string) => void;
  formIngredients: string;
  setFormIngredients: (val: string) => void;
  formInstructions: string;
  setFormInstructions: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function RecipeModal({
  formName,
  setFormName,
  formIngredients,
  setFormIngredients,
  formInstructions,
  setFormInstructions,
  onSubmit
}: RecipeModalProps) {
  const { t } = useI18n();

  return (
    <form onSubmit={onSubmit}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('menu.recipeName')}</label>
        <SaoInput
          type="text"
          placeholder={t('menu.recipeNamePlaceholder')}
          value={formName}
          onChange={e => setFormName(e.target.value)}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('menu.recipeIngredients')}</label>
        <SaoInput
          isTextarea
          placeholder={t('menu.recipeIngredientsPlaceholder')}
          rows={3}
          value={formIngredients}
          onChange={e => setFormIngredients(e.target.value)}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('menu.recipeInstructions')}</label>
        <SaoInput
          isTextarea
          placeholder={t('menu.recipeInstructionsPlaceholder')}
          rows={3}
          value={formInstructions}
          onChange={e => setFormInstructions(e.target.value)}
        />
      </div>

      <div className={styles.modalFooter}>
        <SaoButton variant="primary" type="submit" style={{ width: '100%' }}>
          <Save size={18} style={{ display: 'inline', marginRight: 8 }} />
          {t('menu.saveRecipe')}
        </SaoButton>
      </div>
    </form>
  );
}
