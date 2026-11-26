"use client";

import React from 'react';
import {
  Utensils, ShoppingBag, Plus, Trash2, AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import SaoInput from '@/app/components/SaoInput';
import SaoButton from '@/app/components/SaoButton';
import SaoSelect from '@/app/components/SaoSelect';
import SaoDatePicker from '@/app/components/SaoDatePicker';
import SaoImageUpload from '@/app/components/SaoImageUpload';
import { Recipe, MealRecord, MealIngredientUsed, InventoryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { isSpiceIngredient } from '@/lib/unitHelper';
import styles from './MenuModals.module.css';

export interface MealModalProps {
  modalType: 'meal' | 'cook';
  editingMeal: MealRecord | null;
  editingRecipe: Recipe | null;
  formName: string;
  setFormName: (val: string) => void;
  formImageUrl: string;
  setFormImageUrl: (val: string) => void;
  formCookSource: 'home' | 'eat_out';
  setFormCookSource: (val: 'home' | 'eat_out') => void;
  formDate: string;
  setFormDate: (val: string) => void;
  formActualIngredients: string;
  setFormActualIngredients: (val: string) => void;
  formCost: string;
  setFormCost: (val: string) => void;
  formWalletId: string;
  setFormWalletId: (val: string) => void;
  selectedIngredients: MealIngredientUsed[];
  setSelectedIngredients: React.Dispatch<React.SetStateAction<MealIngredientUsed[]>>;
  inventory: InventoryItem[];
  wallets: { _id: string; name: string; balance: number }[];
  getIngredientPoolInfo: (invId: string) => {
    name: string;
    unit: string;
    currentStock: number;
    oldHeldQty: number;
    effectivePoolQty: number;
  };
  estimateIngredientCost: (invId: string, qty: number) => number;
  estimatedHomeTotalCost: number;
  onSubmit: (e: React.FormEvent) => void;
  showAlert: (msg: string) => void;
}

export default function MealModal({
  modalType,
  editingMeal,
  editingRecipe,
  formName,
  setFormName,
  formImageUrl,
  setFormImageUrl,
  formCookSource,
  setFormCookSource,
  formDate,
  setFormDate,
  formActualIngredients,
  setFormActualIngredients,
  formCost,
  setFormCost,
  formWalletId,
  setFormWalletId,
  selectedIngredients,
  setSelectedIngredients,
  inventory,
  wallets,
  getIngredientPoolInfo,
  estimateIngredientCost,
  estimatedHomeTotalCost,
  onSubmit,
  showAlert
}: MealModalProps) {
  const { t, language } = useI18n();

  const handleAddIngredient = () => {
    const allCandidates = inventory.filter(i => (i.category === 'food' || !i.category) && i.category !== 'spices' && !isSpiceIngredient(i.name) && getIngredientPoolInfo(i.id).effectivePoolQty > 0);
    if (allCandidates.length === 0) {
      showAlert(t('menu.noStockAvailable'));
      return;
    }
    const selectedIds = new Set(selectedIngredients.map(s => s.invId));
    const unselectedCandidate = allCandidates.find(i => !selectedIds.has(i.id));
    const chosen = unselectedCandidate || allCandidates.find(i => {
      const usedQty = selectedIngredients
        .filter(s => s.invId === i.id)
        .reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
      return getIngredientPoolInfo(i.id).effectivePoolQty - usedQty > 1e-6;
    });

    if (!chosen) {
      showAlert(t('menu.allStockSelected'));
      return;
    }
    const pool = getIngredientPoolInfo(chosen.id);
    const alreadyUsed = selectedIngredients
      .filter(s => s.invId === chosen.id)
      .reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
    const remaining = Math.max(0.1, Number((pool.effectivePoolQty - alreadyUsed).toFixed(4)));
    setSelectedIngredients([
      ...selectedIngredients,
      {
        invId: chosen.id,
        qty: Math.min(1, remaining),
        name: chosen.name,
        unit: chosen.unit
      }
    ]);
  };

  return (
    <form onSubmit={onSubmit}>
      {/* ẢNH BỮA ĂN */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('menu.mealPhoto')}</label>
        <div className={styles.photoRow}>
          {formImageUrl && (
            <div className={styles.photoPreviewFrame} style={{ backgroundImage: `url(${formImageUrl})` }}>
              <button
                type="button"
                className={styles.photoRemoveBtn}
                onClick={() => setFormImageUrl('')}
                title={t('common.delete')}
                aria-label={t('common.delete')}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          )}
          <SaoImageUpload onUploadSuccess={(url: string) => setFormImageUrl(url)} />
        </div>
      </div>

      {/* TÊN BỮA ĂN */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          {t('menu.mealName')}
          {formImageUrl && (
            <span className={styles.formLabelAi}>{t('menu.mealNameAutoAi')}</span>
          )}
        </label>
        <SaoInput
          type="text"
          placeholder={formImageUrl ? t('menu.mealNamePlaceholderAi') : t('menu.mealNamePlaceholder')}
          value={formName}
          onChange={e => setFormName(e.target.value)}
          required={modalType === 'meal' && !formImageUrl}
          readOnly={modalType === 'cook'}
        />
      </div>

      {/* HÌNH THỨC ĂN (TỰ NẤU / ĂN NGOÀI) */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('menu.diningOption')}</label>
        <div className={styles.radioGroup}>
          <label className={`${styles.radioPill} ${formCookSource === 'home' ? styles.radioPillActiveHome : ''}`}>
            <input
              type="radio"
              name="source"
              checked={formCookSource === 'home'}
              onChange={() => setFormCookSource('home')}
            />
            <span className={styles.radioPillIcon}>
              <Utensils size={18} />
            </span>
            <span>{t('menu.homeCook')}</span>
          </label>

          <label className={`${styles.radioPill} ${formCookSource === 'eat_out' ? styles.radioPillActiveEatOut : ''}`}>
            <input
              type="radio"
              name="source"
              checked={formCookSource === 'eat_out'}
              onChange={() => setFormCookSource('eat_out')}
            />
            <span className={styles.radioPillIcon}>
              <ShoppingBag size={18} />
            </span>
            <span>{t('menu.eatOut')}</span>
          </label>
        </div>
      </div>

      {/* NGÀY BỮA ĂN */}
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('menu.date')}</label>
          <SaoDatePicker value={formDate} onChange={setFormDate} required />
        </div>
      </div>

      {/* CÔNG THỨC GỢI Ý (NẾU COOK TỪ RECIPE) */}
      {editingRecipe && (
        <div className={styles.recipeGuideCard}>
          <label className={styles.formLabel}>{t('menu.suggestedRecipe')}</label>
          <div className={styles.recipeChipList}>
            {editingRecipe.ingredients.map((ing, i) => (
              <span key={i} className={styles.recipeChip}>{ing}</span>
            ))}
          </div>
          {editingRecipe.instructions && (
            <div className={styles.recipeInstructionsBlock}>
              <strong style={{ color: '#00f0ff', display: 'block', marginBottom: '4px' }}>
                {t('menu.cookingGuide')}:
              </strong>
              {editingRecipe.instructions}
            </div>
          )}
        </div>
      )}

      {/* NGUYÊN LIỆU TỪ KHO (KHI TỰ NẤU) */}
      {formCookSource === 'home' && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('menu.pantryDeductSection')}</label>
          <div className={styles.pantrySection}>
            {selectedIngredients.map((ing, idx) => {
              const pool = getIngredientPoolInfo(ing.invId);
              const rowEstimatedCost = estimateIngredientCost(ing.invId, ing.qty);
              const isOverLimit = Number(ing.qty) > pool.effectivePoolQty + 1e-6;

              const optionIds = new Set<string>();
              const selectOptions: { value: string; label: string }[] = [];

              inventory.filter(item => ((item.category === 'food' || !item.category) && item.category !== 'spices' && !isSpiceIngredient(item.name)) || item.id === ing.invId).forEach(item => {
                const p = getIngredientPoolInfo(item.id);
                if (p.effectivePoolQty > 0 || item.id === ing.invId) {
                  optionIds.add(item.id);
                  let label = `${item.name} (${t('menu.remaining')}: ${p.currentStock} ${item.unit})`;
                  if (p.oldHeldQty > 0) {
                    if (p.currentStock <= 0) {
                      label = `${item.name} (${t('menu.depletedPantry')} • ${t('menu.inUse')}: ${p.oldHeldQty} ${item.unit} → ${t('menu.max')}: ${p.effectivePoolQty} ${item.unit})`;
                    } else {
                      label = `${item.name} (${t('menu.stock')}: ${p.currentStock} + ${t('menu.inUse')}: ${p.oldHeldQty} → ${t('menu.max')}: ${p.effectivePoolQty} ${item.unit})`;
                    }
                  }
                  selectOptions.push({ value: item.id, label });
                }
              });

              if (ing.invId && !optionIds.has(ing.invId)) {
                selectOptions.unshift({
                  value: ing.invId,
                  label: `${pool.name} (${t('menu.deletedFromPantry')} • ${t('menu.holding')}: ${pool.effectivePoolQty} ${pool.unit})`
                });
              }

              return (
                <div
                  key={`${ing.invId}-${idx}`}
                  className={`${styles.deductCard} ${isOverLimit ? styles.deductCardOverLimit : ''}`}
                >
                  <div className={styles.deductCardLeftBar} />
                  <div className={styles.deductCardMain}>
                    <div className={styles.deductSelectWrapper}>
                      <SaoSelect
                        initialValue={ing.invId}
                        options={selectOptions}
                        onChange={(val) => {
                          const targetPool = getIngredientPoolInfo(val);
                          const newArr = selectedIngredients.map((item, i) =>
                            i === idx
                              ? {
                                ...item,
                                invId: val,
                                name: targetPool.name,
                                unit: targetPool.unit,
                                qty: Math.min(Number(item.qty) || 1, Math.max(1, targetPool.effectivePoolQty))
                              }
                              : item
                          );
                          setSelectedIngredients(newArr);
                        }}
                      />
                    </div>
                    <div className={styles.deductQtyWrapper}>
                      <SaoInput
                        type="number"
                        step="any"
                        min="0.01"
                        max={pool.effectivePoolQty > 0 ? pool.effectivePoolQty : undefined}
                        value={ing.qty}
                        onChange={(e) => {
                          const valNum = Number(e.target.value);
                          const newArr = selectedIngredients.map((item, i) =>
                            i === idx ? { ...item, qty: valNum } : item
                          );
                          setSelectedIngredients(newArr);
                        }}
                        className={styles.deductQtyInput}
                      />
                      <span className={styles.deductUnitTag}>{pool.unit}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.deductDeleteBtn}
                      onClick={() => setSelectedIngredients(selectedIngredients.filter((_, i) => i !== idx))}
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className={styles.deductCardSub}>
                    <span className={`${styles.stockBadge} ${isOverLimit ? styles.stockBadgeOver : ''}`}>
                      {isOverLimit ? (
                        <>
                          <AlertTriangle size={13} /> {t('menu.exceedsMax')} ({t('menu.max')}: {pool.effectivePoolQty} {pool.unit})
                        </>
                      ) : (
                        `${t('menu.maxAvailable')}: ${pool.effectivePoolQty} ${pool.unit}${pool.oldHeldQty > 0 && pool.currentStock === 0 ? ` (${t('menu.depletedInStock')})` : ''}`
                      )}
                    </span>
                    {rowEstimatedCost > 0 && (
                      <span className={styles.costBadge}>
                        {t('menu.pantryCost')}: ≈ {rowEstimatedCost.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.vnd')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className={styles.addDeductBtn}
              onClick={handleAddIngredient}
            >
              <Plus size={16} /> {t('menu.addIngredientFromPantry')}
            </button>

            {(selectedIngredients.length > 0 || (editingMeal && editingMeal.source === 'home' && (editingMeal.cost || 0) > 0)) && (
              <div className={styles.totalCostBanner}>
                <div className={styles.totalCostBannerTop}>
                  <span>{t('menu.pantryCost')}:</span>
                  <span className={styles.totalCostValue}>
                    {estimatedHomeTotalCost.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.currency')}
                  </span>
                </div>
                {editingMeal && editingMeal.source === 'home' && (editingMeal.cost || 0) !== estimatedHomeTotalCost && (
                  <div className={styles.totalCostDiff}>
                    {t('menu.diffFromOriginal')}: {(editingMeal.cost || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.currency')} → {estimatedHomeTotalCost.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.currency')}
                    {estimatedHomeTotalCost < (editingMeal.cost || 0)
                      ? ` (${t('menu.refundToPantry')} ${((editingMeal.cost || 0) - estimatedHomeTotalCost).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} ${t('common.currency')})`
                      : ` (${t('menu.deductFromPantry')} ${(estimatedHomeTotalCost - (editingMeal.cost || 0)).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} ${t('common.currency')})`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GHI CHÚ BỔ SUNG */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('menu.additionalNote')}</label>
        <SaoInput
          isTextarea
          placeholder={t('menu.additionalNotePlaceholder')}
          rows={2}
          value={formActualIngredients}
          onChange={e => setFormActualIngredients(e.target.value)}
        />
      </div>

      {/* CHI PHÍ & VÍ (KHI ĂN NGOÀI) */}
      {formCookSource === 'eat_out' && (
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.amountVnd')}</label>
            <SaoInput
              type="number"
              placeholder="0"
              value={formCost}
              onChange={e => setFormCost(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.paymentWallet')}</label>
            <SaoSelect
              initialValue={formWalletId}
              options={wallets.map(w => ({ value: w._id, label: `${w.name} (${w.balance.toLocaleString('vi-VN')} đ)` }))}
              onChange={setFormWalletId}
            />
          </div>
        </div>
      )}

      {/* NÚT LƯU */}
      <div className={styles.modalFooter}>
        <SaoButton variant="primary" type="submit" style={{ width: '100%' }}>
          <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 8 }} />
          {modalType === 'cook' ? t('menu.recordCook') : (editingMeal ? t('menu.editMeal') : t('menu.saveMeal'))}
        </SaoButton>
      </div>
    </form>
  );
}
