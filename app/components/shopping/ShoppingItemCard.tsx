"use client";

import React from 'react';
import { Check, Trash2, Apple, Home as HomeIcon, Package, Clock } from 'lucide-react';
import { GroceryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import styles from './ShoppingItemCard.module.css';

interface ShoppingItemCardProps {
  item: GroceryItem;
  onToggleCheck: (item: GroceryItem) => void;
  onDelete: (id: string) => void;
}

export default function ShoppingItemCard({
  item,
  onToggleCheck,
  onDelete
}: ShoppingItemCardProps) {
  const { t } = useI18n();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food':
        return <Apple size={12} />;
      case 'household':
        return <HomeIcon size={12} />;
      default:
        return <Package size={12} />;
    }
  };

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'food':
        return styles.badgeCategoryFood;
      case 'household':
        return styles.badgeCategoryHousehold;
      default:
        return styles.badgeCategoryOther;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'food':
        return t('shopping.foodTab');
      case 'household':
        return t('shopping.householdTab');
      default:
        return t('shopping.otherTab');
    }
  };

  return (
    <div
      className={`${styles.itemCard} ${item.checked ? styles.itemCardChecked : ''}`}
      onClick={() => onToggleCheck(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleCheck(item);
        }
      }}
    >
      {/* Left Laser Bar */}
      <div className={styles.leftLaserBar} />

      {/* Checkbox */}
      <div className={styles.checkWrapper}>
        <div
          className={`${styles.checkBoxBtn} ${item.checked ? styles.checkBoxBtnChecked : ''}`}
          aria-checked={item.checked}
          role="checkbox"
        >
          {item.checked && <Check size={16} strokeWidth={3} />}
        </div>
      </div>

      {/* Item Body */}
      <div className={styles.itemBody}>
        <div className={styles.nameRow}>
          <span className={`${styles.itemName} ${item.checked ? styles.itemNameChecked : ''}`}>
            {item.name}
          </span>
        </div>

        <div className={styles.metaRow}>
          {/* Category Badge */}
          <span className={`${styles.badgeCategory} ${getCategoryClass(item.category)}`}>
            {getCategoryIcon(item.category)}
            <span>{getCategoryLabel(item.category)}</span>
          </span>

          {/* Quantity Badge */}
          <span className={styles.qtyTag}>
            <span>{t('shopping.quantity')}:</span>
            <span className={styles.qtyValue}>
              {item.quantity} {item.unit}
            </span>
          </span>

          {/* Checked info */}
          {item.checked && (
            <span className={styles.cleanupBadge} title="Tự động dọn dẹp sau 24h">
              <Clock size={11} />
              <span>{t('shopping.autoCleanupNotice', 'Tự xóa sau 24h')}</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item._id);
          }}
          title={t('common.delete')}
          aria-label={t('common.delete')}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
