"use client";

import React from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import SaoInput from '@/app/components/SaoInput';
import SaoButton from '@/app/components/SaoButton';
import SaoSelect from '@/app/components/SaoSelect';
import SaoDatePicker from '@/app/components/SaoDatePicker';
import CyberCheckbox from './CyberCheckbox';
import { InventoryItem } from '@/lib/types';
import { INVENTORY_UNIT_OPTIONS, getInventoryCategoryOptions } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import styles from './MenuModals.module.css';

export interface InventoryFormState {
  name: string;
  category: string;
  stock_status: 'stable' | 'low' | 'out';
  quantity: string;
  unit: string;
  purchaseDate: string;
  expiryDate: string;
  isGift: boolean;
  totalValue: string;
  wallet_id: string;
}

export interface InventoryModalProps {
  inventoryForm: InventoryFormState;
  setInventoryForm: React.Dispatch<React.SetStateAction<InventoryFormState>>;
  editingInventoryItem: InventoryItem | null;
  wallets: { _id: string; name: string; balance: number }[];
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: () => void;
  formatMoney: (val: number) => string;
}

export default function InventoryModal({
  inventoryForm,
  setInventoryForm,
  editingInventoryItem,
  wallets,
  onSubmit,
  onDelete,
  formatMoney
}: InventoryModalProps) {
  const { t } = useI18n();
  const isSpice = inventoryForm.category === 'spices';

  return (
    <form onSubmit={onSubmit}>
      {/* TÊN NGUYÊN LIỆU */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('menu.itemName')}</label>
        <SaoInput
          type="text"
          placeholder={isSpice ? t('menu.spiceItemPlaceholder') : t('menu.foodItemPlaceholder')}
          value={inventoryForm.name}
          onChange={e => setInventoryForm({ ...inventoryForm, name: e.target.value })}
          required
        />
      </div>

      {/* DANH MỤC & SỐ LƯỢNG / MỨC SỬ DỤNG */}
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('menu.category')}</label>
          <SaoSelect
            initialValue={inventoryForm.category}
            options={getInventoryCategoryOptions(t)}
            onChange={v => setInventoryForm({
              ...inventoryForm,
              category: v,
              stock_status: v === 'spices' ? (inventoryForm.stock_status || 'stable') : inventoryForm.stock_status
            })}
          />
        </div>

        {isSpice ? (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.spiceUsageLevel')}</label>
            <SaoSelect
              initialValue={inventoryForm.stock_status}
              options={[
                { value: 'stable', label: t('menu.spiceStable') },
                { value: 'low', label: t('menu.spiceLow') },
                { value: 'out', label: t('menu.spiceOut') }
              ]}
              onChange={v => setInventoryForm({
                ...inventoryForm,
                stock_status: v as 'stable' | 'low' | 'out',
                quantity: v === 'out' ? '0' : '1',
                unit: inventoryForm.unit || 'hộp'
              })}
            />
          </div>
        ) : (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.quantityAndUnit')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <SaoInput
                type="number"
                step="any"
                min="0"
                placeholder="VD: 1.5"
                value={inventoryForm.quantity}
                onChange={e => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                required
              />
              <SaoSelect
                initialValue={inventoryForm.unit}
                placeholder={t('menu.unit')}
                allowCustom={true}
                options={INVENTORY_UNIT_OPTIONS}
                onChange={v => setInventoryForm({ ...inventoryForm, unit: v })}
              />
            </div>
          </div>
        )}
      </div>

      {/* NGÀY MUA & HẠN SỬ DỤNG */}
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('menu.purchaseDateStock')}</label>
          <SaoDatePicker
            value={inventoryForm.purchaseDate}
            onChange={v => setInventoryForm({ ...inventoryForm, purchaseDate: v })}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('menu.expiryDateOptional')}</label>
          <SaoDatePicker
            value={inventoryForm.expiryDate}
            onChange={v => setInventoryForm({ ...inventoryForm, expiryDate: v })}
          />
        </div>
      </div>

      {/* QUÀ TẶNG / KHÔNG TỐN TIỀN (SAO CYBER CHECKBOX) */}
      <div className={styles.formGroup} style={{ marginTop: 4, marginBottom: 8 }}>
        <CyberCheckbox
          checked={inventoryForm.isGift}
          onChange={checked => setInventoryForm({
            ...inventoryForm,
            isGift: checked,
            wallet_id: checked ? '' : inventoryForm.wallet_id
          })}
          label={t('menu.isGiftFree')}
        />
      </div>

      {/* TỔNG TIỀN & VÍ THANH TOÁN */}
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('menu.totalCostEst')}</label>
          <SaoInput
            type="number"
            placeholder="VD: 50000"
            value={inventoryForm.totalValue}
            onChange={e => setInventoryForm({ ...inventoryForm, totalValue: e.target.value })}
          />
        </div>
        {!inventoryForm.isGift && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.paymentSource')}</label>
            <SaoSelect
              initialValue={inventoryForm.wallet_id}
              placeholder={t('menu.selectWallet')}
              options={wallets.map(w => ({ value: w._id, label: `${w.name} (${formatMoney(w.balance)} đ)` }))}
              onChange={v => setInventoryForm({ ...inventoryForm, wallet_id: v })}
            />
          </div>
        )}
      </div>

      {/* NÚT THAO TÁC */}
      <div className={styles.modalFooter} style={{ justifyContent: editingInventoryItem ? 'space-between' : 'flex-end' }}>
        {editingInventoryItem && onDelete && (
          <SaoButton
            variant="danger"
            type="button"
            onClick={onDelete}
          >
            <Trash2 size={16} /> {t('common.delete')}
          </SaoButton>
        )}
        <SaoButton variant="primary" type="submit">
          <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 6 }} />
          {editingInventoryItem ? t('common.save') : t('common.add')}
        </SaoButton>
      </div>
    </form>
  );
}
