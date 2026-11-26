"use client";

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import SaoModal from '@/app/components/SaoModal';
import SaoInput from '@/app/components/SaoInput';
import SaoSelect from '@/app/components/SaoSelect';
import SaoButton from '@/app/components/SaoButton';
import { getGroceryCategoryOptions } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import styles from './ShoppingModal.module.css';

interface ShoppingAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    quantity: number;
    unit: string;
    category: 'food' | 'household' | 'other';
  }) => Promise<void> | void;
}

export default function ShoppingAddModal({
  isOpen,
  onClose,
  onAdd
}: ShoppingAddModalProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'cái',
    category: 'food' as 'food' | 'household' | 'other'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(formData);
      setFormData({ name: '', quantity: 1, unit: 'cái', category: 'food' });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SaoModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('shopping.addItemModal')}
      icon={<Plus size={20} />}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('shopping.itemName')}</label>
          <SaoInput
            type="text"
            placeholder={t('shopping.itemNamePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('shopping.quantity')}</label>
            <SaoInput
              type="number"
              min="0.01"
              step="any"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('shopping.unit')}</label>
            <SaoInput
              type="text"
              placeholder={t('shopping.unitPlaceholder')}
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('shopping.category')}</label>
          <SaoSelect
            options={getGroceryCategoryOptions(t)}
            initialValue={formData.category}
            onChange={(val) => setFormData({ ...formData, category: val as 'food' | 'household' | 'other' })}
          />
        </div>

        <div className={styles.modalFooter}>
          <SaoButton variant="default" onClick={onClose} type="button">
            {t('common.cancel')}
          </SaoButton>
          <SaoButton variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('common.add')}
          </SaoButton>
        </div>
      </form>
    </SaoModal>
  );
}
