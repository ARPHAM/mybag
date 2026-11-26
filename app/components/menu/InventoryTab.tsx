"use client";

import { useState } from 'react';
import {
  Package, Camera, ImageIcon, Sparkles, Plus
} from 'lucide-react';
import SaoButton from '../SaoButton';
import SaoSearchInput from '../SaoSearchInput';
import SaoSelect from '../SaoSelect';
import InventoryCard from './InventoryCard';
import { useI18n } from '@/lib/i18n';
import styles from '@/app/(main)/menu/menu.module.css';
import type { InventoryItem } from '@/lib/types';

interface Props {
  inventory: InventoryItem[];
  formatMoney: (n: number) => string;
  isFabExpanded: boolean;
  onToggleFab: () => void;
  onManualAdd: () => void;
  onEdit: (item: InventoryItem) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onUpdateStockStatus?: (id: string, status: 'stable' | 'low' | 'out') => void;
  onScanBill: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function InventoryTab({
  inventory,
  formatMoney,
  isFabExpanded,
  onToggleFab,
  onManualAdd,
  onEdit,
  onUpdateQty,
  onUpdateStockStatus,
  onScanBill
}: Props) {
  const { t } = useI18n();
  const [filterCat, setFilterCat] = useState<'all' | 'food' | 'spices'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const totalMainFood = inventory.filter(i => (i.category === 'food' || !i.category) && i.category !== 'utilities').length;
  const totalSpices = inventory.filter(i => i.category === 'spices').length;
  const totalOutSpices = inventory.filter(i => i.category === 'spices' && (i.stock_status === 'out' || (!i.stock_status && i.quantity <= 0))).length;

  const filterOptions = [
    { value: 'all', label: `${t('menu.allStock')} (${inventory.filter(i => i.category !== 'utilities').length})` },
    { value: 'food', label: `${t('menu.mainFood')} (${totalMainFood})` },
    { value: 'spices', label: `${t('menu.spices')} (${totalSpices}${totalOutSpices > 0 ? ` - ${totalOutSpices} ${t('menu.statusOut').toLowerCase()}` : ''})` }
  ];

  const filtered = inventory.filter(item => {
    if (item.category === 'utilities') return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchName = item.name?.toLowerCase().includes(term);
      const matchCat = item.category?.toLowerCase().includes(term);
      const matchUnit = item.unit?.toLowerCase().includes(term);
      if (!matchName && !matchCat && !matchUnit) return false;
    }

    if (filterCat === 'all') return true;
    if (filterCat === 'food') return item.category === 'food' || !item.category;
    if (filterCat === 'spices') return item.category === 'spices';
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const isASpice = a.category === 'spices';
    const isBSpice = b.category === 'spices';
    if (isASpice !== isBSpice) return isASpice ? 1 : -1;

    const aOut = (a.stock_status === 'out') || (a.quantity === 0 && !isASpice);
    const bOut = (b.stock_status === 'out') || (b.quantity === 0 && !isBSpice);
    if (aOut && !bOut) return 1;
    if (!aOut && bOut) return -1;

    return 0;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Toolbar: Search + Category Filter */}
      <div className={styles.invToolbar}>
        <div className={styles.invSearchWrapper}>
          <SaoSearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder={t('menu.searchPlaceholder')}
          />
        </div>
        <div className={styles.invFilterWrapper}>
          <SaoSelect
            value={filterCat}
            onChange={(val) => setFilterCat(val as 'all' | 'food' | 'spices')}
            options={filterOptions}
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '50px 20px' }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: 12, display: 'inline-block' }} />
          <div>{searchTerm ? 'Không tìm thấy vật phẩm nào khớp với tìm kiếm.' : t('menu.emptyPantry')}</div>
          {!searchTerm && (
            <div style={{ fontSize: '0.85rem', color: '#a0c4ff', marginTop: 8 }}>
              {t('menu.emptyPantrySub')}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.inventoryGrid}>
          {sorted.map(item => (
            <InventoryCard
              key={item.id}
              item={item}
              formatMoney={formatMoney}
              onEdit={onEdit}
              onUpdateQty={onUpdateQty}
              onUpdateStockStatus={onUpdateStockStatus}
            />
          ))}
        </div>
      )}

      {/* FAB Quét hóa đơn & Thêm kho */}
      <div className={styles.inventoryFabGroup}>
        {isFabExpanded && (
          <>
            <label className={styles.scanFabLabel} title="Chụp ảnh qua camera" style={{ marginBottom: 0 }}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => { onToggleFab(); onScanBill(e); }}
              />
              <div className={styles.scanFab} style={{ width: 42, height: 42, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Camera size={18} />
              </div>
            </label>
            <label className={styles.scanFabLabel} title="Tải ảnh từ thiết bị" style={{ marginBottom: 0 }}>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { onToggleFab(); onScanBill(e); }}
              />
              <div className={styles.scanFab} style={{ width: 42, height: 42, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <ImageIcon size={18} />
              </div>
            </label>
            <SaoButton
              variant="default"
              className={styles.manualAddFab}
              title={t('menu.addInventory')}
              onClick={() => { onToggleFab(); onManualAdd(); }}
              style={{ width: 42, height: 42, borderRadius: '50%', padding: 0 }}
            >
              <Plus size={20} />
            </SaoButton>
          </>
        )}
        <SaoButton
          variant="primary"
          className={styles.menuFabMain}
          onClick={onToggleFab}
          title={t('menu.addInventory')}
        >
          <Plus size={26} style={{ transform: isFabExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s' }} />
        </SaoButton>
      </div>
    </div>
  );
}
