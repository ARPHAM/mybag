"use client";

import {
  Edit3, Wheat, Package, Wallet,
  ShieldAlert, Minus, Plus, Camera, ImageIcon
} from 'lucide-react';
import SaoButton from '../../../components/SaoButton/SaoButton';
import styles from '../finance.module.css';
import type { InventoryItem } from '@/lib/types';

interface Props {
  inventory: InventoryItem[];
  formatMoney: (n: number) => string;
  isFabExpanded: boolean;
  onToggleFab: () => void;
  onManualAdd: () => void;
  onEdit: (item: InventoryItem) => void;
  onUpdateQty: (id: string, delta: number) => void;
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
  onScanBill
}: Props) {
  const sorted = [...inventory].sort((a, b) => {
    if (a.quantity === 0 && b.quantity > 0) return 1;
    if (a.quantity > 0 && b.quantity === 0) return -1;
    return 0;
  });

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className={styles.inventoryGrid}>
        {sorted.map(item => {
          let stockClass = styles.stockHigh;
          if (item.quantity === 0) stockClass = styles.stockEmpty;
          else if (item.quantity <= 2) stockClass = styles.stockLow;

          return (
            <div key={item.id} className={`${styles.inventoryCard} ${stockClass}`}>
              <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                <Edit3 size={16} />
              </SaoButton>
              <div className={styles.inventoryContent}>
                <div className={styles.inventoryName}>
                  {item.category === 'food' ? <Wheat size={18} color="#00ffaa" /> : <Package size={18} color="#a0c4ff" />}
                  {item.name}
                </div>
                <div className={styles.inventoryMeta}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Phân loại: {item.category === 'food' ? 'Thực phẩm' : item.category === 'spices' ? 'Gia vị' : 'Đồ dùng'}</span>
                    <span style={{ color: '#00f0ff' }}>
                      {item.isGift ? '🎁 Được tặng' : (
                        <>
                          <Wallet size={10} style={{ display: 'inline', marginRight: 4 }} />
                          {item.walletName}
                        </>
                      )}
                    </span>
                  </div>
                  {(item.totalValue !== undefined && item.totalValue > 0) && (
                    <div style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '4px' }}>
                      {item.isGift ? 'Ước tính giá:' : 'Tổng giá trị:'} {formatMoney(item.totalValue)}
                      {item.quantity > 0 && (
                        <span style={{ color: '#a0c4ff' }}> (≈ {formatMoney(Math.round(item.totalValue / item.quantity))} đ/{item.unit})</span>
                      )}
                    </div>
                  )}
                  {item.expiryDate && (
                    <span className={styles.inventoryWarning}>
                      <ShieldAlert size={12} /> {item.expiryDate}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.inventoryActions}>
                <SaoButton
                  variant="ghost"
                  className={styles.qtyBtn}
                  onClick={() => onUpdateQty(item.id, -1)}
                  disabled={item.quantity <= 1}
                  style={{ opacity: item.quantity <= 1 ? 0.5 : 1, cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', padding: 0 }}
                >
                  <Minus size={16} />
                </SaoButton>
                <div className={styles.qtyValue}>
                  {item.quantity}
                  <span className={styles.qtyUnit}>{item.unit}</span>
                </div>
                <SaoButton variant="ghost" className={styles.qtyBtn} onClick={() => onUpdateQty(item.id, 1)} style={{ padding: 0 }}>
                  <Plus size={16} />
                </SaoButton>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <div style={{ position: 'absolute', bottom: 30, right: 30, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
        {isFabExpanded && (
          <>
            <label className={styles.scanFabLabel} title="Chụp ảnh hóa đơn" style={{ marginBottom: 0 }}>
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => { onToggleFab(); onScanBill(e); }} />
              <div className={styles.scanFab} style={{ width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Camera size={18} />
              </div>
            </label>

            <label className={styles.scanFabLabel} title="Chọn từ thư viện" style={{ marginBottom: 0 }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { onToggleFab(); onScanBill(e); }} />
              <div className={styles.scanFab} style={{ width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <ImageIcon size={18} />
              </div>
            </label>

            <SaoButton variant="primary" style={{ borderRadius: '50%', width: 40, height: 40, padding: 0 }} title="Thêm thủ công" onClick={() => { onToggleFab(); onManualAdd(); }}>
              <Edit3 size={18} />
            </SaoButton>
          </>
        )}

        <SaoButton
          variant="primary"
          style={{ borderRadius: '50%', width: 56, height: 56, boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)', transition: 'transform 0.3s' }}
          onClick={onToggleFab}
        >
          <Plus size={32} style={{ transform: isFabExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
        </SaoButton>
      </div>
    </div>
  );
}
