"use client";

import React, { useState, useEffect } from 'react';
import { PackageCheck, Wallet as WalletIcon, Calendar } from 'lucide-react';
import SaoModal from '@/app/components/SaoModal';
import SaoInput from '@/app/components/SaoInput';
import SaoSelect from '@/app/components/SaoSelect';
import SaoDatePicker from '@/app/components/SaoDatePicker';
import SaoButton from '@/app/components/SaoButton';
import { GroceryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import styles from './ShoppingModal.module.css';

export interface WalletOption {
  _id?: string;
  id?: string;
  name: string;
  balance?: number;
}

interface ShoppingPurchaseModalProps {
  item: GroceryItem | null;
  wallets: WalletOption[];
  onClose: () => void;
  onConfirm: (
    item: GroceryItem,
    payload: {
      amount: number;
      wallet_id?: string;
      quantity: number;
      unit: string;
      addToInventory: boolean;
      inventoryCategory: 'food' | 'spices' | 'utilities';
      expiryDate?: string;
      isGift?: boolean;
    }
  ) => Promise<void> | void;
}

function addDaysLocal(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
}

export default function ShoppingPurchaseModal({
  item,
  wallets,
  onClose,
  onConfirm
}: ShoppingPurchaseModalProps) {
  const { t, language } = useI18n();
  const [amount, setAmount] = useState<string>('');
  const [walletId, setWalletId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<string>('món');
  const [addToInventory, setAddToInventory] = useState<boolean>(true);
  const [inventoryCategory, setInventoryCategory] = useState<'food' | 'spices' | 'utilities'>('food');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setAmount('');
      const defaultW = wallets[0]?._id || wallets[0]?.id || '';
      setWalletId(defaultW);
      setQuantity(String(item.quantity ?? 1));
      setUnit(item.unit || 'món');
      setAddToInventory(true);
      setInventoryCategory(item.category === 'food' ? 'food' : 'utilities');
      setExpiryDate('');
    }
  }, [item, wallets]);

  if (!item) return null;

  const numericAmount = Math.max(0, Math.round(Number(amount) || 0));

  const walletOptions = wallets.map((w) => {
    const id = w._id || w.id || '';
    const bal = typeof w.balance === 'number' ? ` (${w.balance.toLocaleString('vi-VN')}đ)` : '';
    return { value: id, label: `${w.name}${bal}` };
  });

  const invCategoryOptions = [
    { value: 'food', label: language === 'en' ? 'Main Food' : 'Thực phẩm chính' },
    { value: 'spices', label: language === 'en' ? 'Spices' : 'Gia vị / Phụ phẩm' },
    { value: 'utilities', label: language === 'en' ? 'Household / Utilities' : 'Đồ dùng / Gia dụng' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    setIsSubmitting(true);
    try {
      await onConfirm(item, {
        amount: numericAmount,
        wallet_id: numericAmount > 0 ? walletId : undefined,
        quantity: qtyNum,
        unit: unit.trim() || item.unit,
        addToInventory,
        inventoryCategory,
        expiryDate: expiryDate || undefined,
        isGift: numericAmount === 0
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SaoModal
      isOpen={!!item}
      onClose={onClose}
      title={language === 'en' ? `Buy & Store: ${item.name}` : `Mua & cất kho: ${item.name}`}
      icon={<PackageCheck size={20} />}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('shopping.quantity')}</label>
            <SaoInput
              type="number"
              min="0.01"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('shopping.unit')}</label>
            <SaoInput
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            {language === 'en' ? 'Amount Paid (VND, leave 0 if gift/untracked)' : 'Số tiền đã trả (VNĐ — để 0 nếu không trừ ví)'}
          </label>
          <SaoInput
            type="number"
            min="0"
            step="1000"
            placeholder="Vd: 85000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        {numericAmount > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <WalletIcon size={13} />
              {language === 'en' ? 'Payment Wallet' : 'Ví thanh toán'}
            </label>
            <SaoSelect
              options={walletOptions}
              initialValue={walletId}
              onChange={(val) => setWalletId(val)}
            />
          </div>
        )}

        <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            id="purchase-add-to-inv"
            type="checkbox"
            checked={addToInventory}
            onChange={(e) => setAddToInventory(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#00f0ff', cursor: 'pointer' }}
          />
          <label htmlFor="purchase-add-to-inv" className={styles.formLabel} style={{ margin: 0, cursor: 'pointer' }}>
            {language === 'en' ? 'Store directly into Kitchen Inventory' : 'Cất thẳng vào Kho đồ (Tủ lạnh / Gia dụng)'}
          </label>
        </div>

        {addToInventory && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{language === 'en' ? 'Inventory Category' : 'Phân loại trong Kho'}</label>
              <SaoSelect
                options={invCategoryOptions}
                initialValue={inventoryCategory}
                onChange={(val) => setInventoryCategory(val as 'food' | 'spices' | 'utilities')}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} />
                {language === 'en' ? 'Expiry Date (Optional)' : 'Hạn sử dụng (Tùy chọn)'}
              </label>
              <SaoDatePicker
                value={expiryDate}
                onChange={(val) => setExpiryDate(val)}
                placeholder={language === 'en' ? 'Select expiry date' : 'Chọn ngày hết hạn (không bắt buộc)'}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  { days: 3, label: '+3 ngày' },
                  { days: 7, label: '+7 ngày' },
                  { days: 14, label: '+14 ngày' }
                ].map((chip) => (
                  <button
                    key={chip.days}
                    type="button"
                    onClick={() => setExpiryDate(addDaysLocal(chip.days))}
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.75rem',
                      fontFamily: 'Tauri, sans-serif',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.35)',
                      color: '#00f0ff',
                      cursor: 'pointer'
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
                {expiryDate && (
                  <button
                    type="button"
                    onClick={() => setExpiryDate('')}
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {language === 'en' ? 'Clear' : 'Bỏ HSD'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        <div className={styles.modalFooter}>
          <SaoButton variant="default" onClick={onClose} type="button">
            {t('common.cancel')}
          </SaoButton>
          <SaoButton variant="primary" type="submit" disabled={isSubmitting || (numericAmount > 0 && !walletId)}>
            {isSubmitting
              ? t('common.loading')
              : (language === 'en' ? 'Confirm Buy & Store' : 'Xác nhận Mua & cất kho')}
          </SaoButton>
        </div>
      </form>
    </SaoModal>
  );
}
