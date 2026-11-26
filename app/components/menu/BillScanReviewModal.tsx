"use client";

import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import SaoButton from '@/app/components/SaoButton';
import SaoSelect from '@/app/components/SaoSelect';
import CyberCheckbox from './CyberCheckbox';
import { useI18n } from '@/lib/i18n';
import styles from './MenuModals.module.css';

export interface ScannedBillItem {
  name: string;
  quantity: number | string;
  unit?: string;
  price?: number;
  category?: string;
  keep?: boolean;
}

export interface BillScanReviewModalProps {
  scannedBillItems: ScannedBillItem[];
  setScannedBillItems: React.Dispatch<React.SetStateAction<ScannedBillItem[]>>;
  billWalletId: string;
  setBillWalletId: (val: string) => void;
  wallets: { _id: string; name: string; balance: number }[];
  onSubmit: (e: React.FormEvent) => void;
  formatMoney: (val: number) => string;
}

export default function BillScanReviewModal({
  scannedBillItems,
  setScannedBillItems,
  billWalletId,
  setBillWalletId,
  wallets,
  onSubmit,
  formatMoney
}: BillScanReviewModalProps) {
  const { t, language } = useI18n();

  return (
    <form onSubmit={onSubmit}>
      {/* AI RECOGNIZED CALLOUT */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#a0c4ff',
        fontSize: '0.86rem',
        marginBottom: '14px',
        padding: '8px 12px',
        background: 'rgba(0, 240, 255, 0.06)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: '6px'
      }}>
        <Sparkles size={16} style={{ color: '#00f0ff', flexShrink: 0 }} />
        <span>{t('menu.aiRecognizedBill')}</span>
      </div>

      {/* DANH SÁCH MẶT HÀNG */}
      <div className={styles.scannedItemList}>
        {scannedBillItems.map((item, idx) => (
          <div key={idx} className={styles.scannedItemCard}>
            <CyberCheckbox
              checked={!!item.keep}
              onChange={checked => {
                const newArr = [...scannedBillItems];
                newArr[idx].keep = checked;
                setScannedBillItems(newArr);
              }}
            />
            <div className={styles.scannedItemInfo}>
              <div className={styles.scannedItemName}>{item.name}</div>
              <div className={styles.scannedItemMeta}>
                <span>
                  {item.quantity} {item.unit || (language === 'en' ? 'pcs' : 'cái')}
                </span>
                <span>•</span>
                <span className={styles.scannedItemPrice}>
                  {formatMoney(item.price || 0)} {t('common.vnd')}
                </span>
                <span>•</span>
                <span className={styles.scannedCategoryTag}>
                  {item.category === 'spices'
                    ? t('menu.spices')
                    : item.category === 'utilities'
                      ? 'Đồ dùng (Ghi chi tiêu)'
                      : t('menu.mainFood')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* VÍ THANH TOÁN */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('menu.paymentWallet')}</label>
        <SaoSelect
          value={billWalletId}
          initialValue={billWalletId}
          placeholder={t('menu.selectWallet')}
          options={wallets.map(w => ({ value: w._id || (w as any).id, label: `${w.name} (${formatMoney(w.balance)} đ)` }))}
          onChange={setBillWalletId}
        />
      </div>

      {/* NÚT LƯU */}
      <div className={styles.modalFooter}>
        <SaoButton variant="primary" type="submit" style={{ width: '100%' }}>
          <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 6 }} />
          {t('menu.saveScannedBill')}
        </SaoButton>
      </div>
    </form>
  );
}
