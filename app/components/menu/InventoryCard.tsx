"use client";

import React from 'react';
import {
  Edit3, Wheat, Package, Wallet, ShieldAlert,
  Minus, Plus, Flame, Gift, CheckCircle2,
  XCircle, AlertCircle, AlertTriangle
} from 'lucide-react';
import styles from './InventoryCard.module.css';
import type { InventoryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

export interface InventoryCardProps {
  item: InventoryItem;
  formatMoney: (n: number) => string;
  onEdit: (item: InventoryItem) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onUpdateStockStatus?: (id: string, status: 'stable' | 'low' | 'out') => void;
}

export default function InventoryCard({
  item,
  formatMoney,
  onEdit,
  onUpdateQty,
  onUpdateStockStatus,
}: InventoryCardProps) {
  const { t } = useI18n();
  const isSpice = item.category === 'spices';

  // Smart fractional stepper (v1.1): kg/l ±0.25, g/ml ±100, đơn vị đếm ±1
  const normalizedUnit = (item.unit || '').trim().toLowerCase();
  const stepSize =
    ['kg', 'l', 'lít', 'lit'].includes(normalizedUnit)
      ? 0.25
      : ['g', 'gr', 'gram', 'ml'].includes(normalizedUnit)
        ? 100
        : 1;
  const decrementDelta = item.quantity <= stepSize
    ? -Number(item.quantity.toFixed(4))
    : -stepSize;
  const formattedQty = Number(item.quantity.toFixed(2));

  // Xác định trạng thái tồn kho
  const resolvedStatus: 'stable' | 'low' | 'out' = item.stock_status
    ? item.stock_status
    : (item.quantity <= 0 ? 'out' : item.quantity <= 2 ? 'low' : 'stable');

  // Màu trục quang học HUD tương ứng với tình trạng kho
  let stockColor = '#00f0ff';
  if (isSpice) {
    if (resolvedStatus === 'out') stockColor = '#ff4444';
    else if (resolvedStatus === 'low') stockColor = '#ffaa00';
    else stockColor = '#00ffaa';
  } else {
    if (item.quantity <= 0) stockColor = '#ff4444';
    else if (item.quantity <= 2) stockColor = '#ffaa00';
    else stockColor = '#00ffaa';
  }

  return (
    <div
      className={styles.card}
      style={{ '--stock-color': stockColor } as React.CSSProperties}
    >
      <span className={styles.leftAccentBar} aria-hidden="true" />
      <span className={styles.bevelTL} aria-hidden="true" />

      {/* Nút chỉnh sửa */}
      <button
        type="button"
        className={styles.editBtn}
        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
        title={t('menu.editDetails')}
      >
        <Edit3 size={14} />
      </button>

      <div className={styles.content}>
        {/* Tên & Icon phân loại */}
        <div className={styles.nameRow}>
          <div className={styles.categoryIcon}>
            {isSpice ? (
              <Flame size={18} color="#ffaa00" />
            ) : (
              <Wheat size={18} color="#00ffaa" />
            )}
          </div>
          <span className={styles.itemName}>{item.name}</span>
        </div>

        {/* Phân loại & Ví thanh toán */}
        <div className={styles.metaRow}>
          <span
            className={styles.categoryTag}
            style={{ color: isSpice ? '#ffcc66' : '#70d6ff' }}
          >
            {isSpice ? t('menu.spices') : t('menu.mainFood')}
          </span>

          <span className={styles.walletInfo}>
            {item.isGift ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ffd166' }}>
                <Gift size={12} /> {t('menu.gift')}
              </span>
            ) : (
              <>
                <Wallet size={11} />
                {item.walletName || t('menu.unassignedWallet')}
              </>
            )}
          </span>
        </div>

        {/* Trạng thái chi tiết & Giá trị ước tính */}
        {isSpice ? (
          <div>
            {resolvedStatus === 'stable' && (
              <span className={styles.statusIndicator} style={{ color: '#00ffaa' }}>
                <CheckCircle2 size={13} /> {t('menu.statusStable')}
              </span>
            )}
            {resolvedStatus === 'low' && (
              <span className={styles.statusIndicator} style={{ color: '#ffaa00' }}>
                <AlertCircle size={13} /> {t('menu.statusLow')}
              </span>
            )}
            {resolvedStatus === 'out' && (
              <span className={styles.statusIndicator} style={{ color: '#ff6666' }}>
                <XCircle size={13} /> {t('menu.statusOut')}
              </span>
            )}
          </div>
        ) : (
          <div>
            {item.quantity <= 0 && (
              <div className={styles.statusIndicator} style={{ color: '#ff6666' }}>
                <AlertTriangle size={13} /> {t('menu.statusDepletedNote')}
              </div>
            )}
            {item.totalValue !== undefined && item.totalValue > 0 && (
              <div className={styles.valueRow}>
                {item.isGift ? `${t('menu.estimatedValue')}:` : `${t('menu.remainingValue')}:`}{' '}
                <strong>{formatMoney(item.totalValue)}</strong>
                {item.quantity > 0 && (
                  <span className={styles.unitValue}>
                    {' '}(≈ {formatMoney(Math.round(item.totalValue / item.quantity))} /{item.unit})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hạn sử dụng */}
        {item.expiryDate && (
          <div className={styles.warningBadge}>
            <ShieldAlert size={12} /> HSD: {item.expiryDate}
          </div>
        )}
      </div>

      {/* Khu vực thao tác: Segment 3 nấc cho gia vị hoặc Stepper +/- cho thực phẩm chính */}
      {isSpice ? (
        <div className={styles.spiceStatusGroup}>
          <button
            type="button"
            className={`${styles.spiceStatusBtn} ${resolvedStatus === 'stable' ? styles.spiceStatusBtnStableActive : ''}`}
            onClick={() => onUpdateStockStatus?.(item.id, 'stable')}
            title={t('menu.statusStable')}
          >
            {t('menu.statusStable')}
          </button>
          <button
            type="button"
            className={`${styles.spiceStatusBtn} ${resolvedStatus === 'low' ? styles.spiceStatusBtnLowActive : ''}`}
            onClick={() => onUpdateStockStatus?.(item.id, 'low')}
            title={t('menu.statusLow')}
          >
            {t('menu.statusLow')}
          </button>
          <button
            type="button"
            className={`${styles.spiceStatusBtn} ${resolvedStatus === 'out' ? styles.spiceStatusBtnOutActive : ''}`}
            onClick={() => onUpdateStockStatus?.(item.id, 'out')}
            title={t('menu.statusOut')}
          >
            {t('menu.statusOut')}
          </button>
        </div>
      ) : (
        <div className={styles.actionsRow}>
          <div className={styles.qtyBox}>
            <span className={styles.qtyNumber}>{formattedQty}</span>
            <span className={styles.qtyUnit}>{item.unit}</span>
          </div>

          <div className={styles.stepperGroup}>
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => onUpdateQty(item.id, decrementDelta)}
              disabled={item.quantity <= 0}
              title={`-${stepSize} ${item.unit}`}
              aria-label={`Giảm ${stepSize} ${item.unit}`}
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => onUpdateQty(item.id, stepSize)}
              title={`+${stepSize} ${item.unit}`}
              aria-label={`Tăng ${stepSize} ${item.unit}`}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
