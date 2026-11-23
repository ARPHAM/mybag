"use client";

import { useState } from 'react';
import {
  Edit3, Wheat, Package, Wallet,
  ShieldAlert, Minus, Plus, Camera, ImageIcon,
  Sparkles, Check, AlertCircle, CircleDot, Flame
} from 'lucide-react';
import SaoButton from '../../../components/SaoButton/SaoButton';
import styles from '../menu.module.css';
import type { InventoryItem } from '@/lib/types';

interface Props {
  inventory: InventoryItem[];
  formatMoney: (n: number) => string;
  isFabExpanded: boolean;
  onToggleFab: () => void;
  onManualAdd: () => void;
  onEdit: (item: InventoryItem) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onUpdateStockStatus: (id: string, status: 'stable' | 'low' | 'out') => void;
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
  const [filterCat, setFilterCat] = useState<'all' | 'food' | 'spices' | 'utilities'>('all');

  const filtered = inventory.filter(item => {
    if (filterCat === 'all') return true;
    if (filterCat === 'food') return item.category === 'food' || !item.category;
    if (filterCat === 'spices') return item.category === 'spices';
    if (filterCat === 'utilities') return item.category === 'utilities';
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

  const totalMainFood = inventory.filter(i => i.category === 'food' || !i.category).length;
  const totalSpices = inventory.filter(i => i.category === 'spices').length;
  const totalOutSpices = inventory.filter(i => i.category === 'spices' && (i.stock_status === 'out' || (!i.stock_status && i.quantity <= 0))).length;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Category Filter Pills */}
      <div className={styles.invFilterBar}>
        <button
          type="button"
          className={`${styles.filterPill} ${filterCat === 'all' ? styles.filterPillActive : ''}`}
          onClick={() => setFilterCat('all')}
        >
          Tất cả ({inventory.length})
        </button>
        <button
          type="button"
          className={`${styles.filterPill} ${filterCat === 'food' ? styles.filterPillActive : ''}`}
          onClick={() => setFilterCat('food')}
        >
          🥩 Thực phẩm chính ({totalMainFood})
        </button>
        <button
          type="button"
          className={`${styles.filterPill} ${filterCat === 'spices' ? styles.filterPillActive : ''}`}
          onClick={() => setFilterCat('spices')}
        >
          🧂 Gia vị & Phụ liệu ({totalSpices})
          {totalOutSpices > 0 && (
            <span style={{ marginLeft: 6, fontSize: '0.72rem', background: 'rgba(255, 68, 68, 0.25)', color: '#ff6666', padding: '1px 5px', borderRadius: '10px' }}>
              {totalOutSpices} hết
            </span>
          )}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '50px 20px' }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: 12, display: 'inline-block' }} />
          <div>Chưa có mặt hàng nào trong danh mục này.</div>
          <div style={{ fontSize: '0.85rem', color: '#a0c4ff', marginTop: 8 }}>
            Bấm dấu + ở góc dưới để thêm thực phẩm hoặc chụp hóa đơn!
          </div>
        </div>
      ) : (
        <div className={styles.inventoryGrid}>
          {sorted.map(item => {
            const isSpice = item.category === 'spices';
            const resolvedStatus: 'stable' | 'low' | 'out' = item.stock_status
              ? item.stock_status
              : (item.quantity <= 0 ? 'out' : item.quantity <= 2 ? 'low' : 'stable');

            let stockClass = styles.stockHigh;
            if (isSpice) {
              if (resolvedStatus === 'out') stockClass = styles.stockEmpty;
              else if (resolvedStatus === 'low') stockClass = styles.stockLow;
              else stockClass = styles.stockHigh;
            } else {
              if (item.quantity === 0) stockClass = styles.stockEmpty;
              else if (item.quantity <= 2) stockClass = styles.stockLow;
            }

            return (
              <div key={item.id} className={`${styles.inventoryCard} ${stockClass}`}>
                <SaoButton
                  variant="ghost"
                  className={styles.editBtn}
                  onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                  title="Chỉnh sửa chi tiết"
                >
                  <Edit3 size={15} />
                </SaoButton>

                <div className={styles.inventoryContent}>
                  <div className={styles.inventoryName}>
                    {isSpice ? (
                      <Flame size={18} color="#ffaa00" />
                    ) : item.category === 'food' || !item.category ? (
                      <Wheat size={18} color="#00ffaa" />
                    ) : (
                      <Package size={18} color="#a0c4ff" />
                    )}
                    <span>{item.name}</span>
                  </div>

                  <div className={styles.inventoryMeta}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: isSpice ? '#ffcc66' : '#a0c4ff' }}>
                        {isSpice ? 'Gia vị & Phụ liệu' : item.category === 'utilities' ? 'Đồ dùng' : 'Thực phẩm chính'}
                      </span>
                      <span style={{ color: '#00f0ff', fontSize: '0.78rem' }}>
                        {item.isGift ? '🎁 Được tặng' : (
                          <>
                            <Wallet size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            {item.walletName || 'Chưa gán ví'}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Hiển thị đặc thù cho Gia vị vs Thực phẩm chính */}
                    {isSpice ? (
                      <div style={{ marginTop: 2, marginBottom: 4 }}>
                        {resolvedStatus === 'stable' && (
                          <span style={{ color: '#00ffaa', fontSize: '0.8rem', fontWeight: 600 }}>
                            🟢 Còn ổn • Dùng dài ngày (không cần mua)
                          </span>
                        )}
                        {resolvedStatus === 'low' && (
                          <span style={{ color: '#ffcc00', fontSize: '0.8rem', fontWeight: 600 }}>
                            🟡 Còn ít • Đủ vài bữa tới (cân nhắc mua thêm)
                          </span>
                        )}
                        {resolvedStatus === 'out' && (
                          <span style={{ color: '#ff6666', fontSize: '0.8rem', fontWeight: 600 }}>
                            🔴 Đã hết • Chờ món cần mới gợi ý mua
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        {item.quantity <= 0 && (
                          <div style={{ color: '#ff4444', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            ⚠️ Đã dùng hết (Sẽ dọn sau 7 ngày nếu không bổ sung)
                          </div>
                        )}
                        {(item.totalValue !== undefined && item.totalValue > 0) && (
                          <div style={{ color: '#fff', fontSize: '0.82rem' }}>
                            {item.isGift ? 'Ước tính giá:' : 'Giá trị còn lại:'} {formatMoney(item.totalValue)}
                            {item.quantity > 0 && (
                              <span style={{ color: '#a0c4ff' }}> (≈ {formatMoney(Math.round(item.totalValue / item.quantity))} đ/{item.unit})</span>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {item.expiryDate && (
                      <span className={styles.inventoryWarning}>
                        <ShieldAlert size={12} /> HSD: {item.expiryDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Khu vực thao tác: Segment 1 chạm cho gia vị, hoặc +/- số lượng cho đồ chính */}
                {isSpice ? (
                  <div className={styles.spiceStatusGroup}>
                    <button
                      type="button"
                      className={`${styles.spiceStatusBtn} ${resolvedStatus === 'stable' ? styles.spiceStatusBtnStableActive : ''}`}
                      onClick={() => onUpdateStockStatus(item.id, 'stable')}
                      title="Đánh dấu Còn ổn (dùng dài ngày)"
                    >
                      Còn ổn
                    </button>
                    <button
                      type="button"
                      className={`${styles.spiceStatusBtn} ${resolvedStatus === 'low' ? styles.spiceStatusBtnLowActive : ''}`}
                      onClick={() => onUpdateStockStatus(item.id, 'low')}
                      title="Đánh dấu Còn ít (sắp hết, đủ vài bữa tới)"
                    >
                      Còn ít
                    </button>
                    <button
                      type="button"
                      className={`${styles.spiceStatusBtn} ${resolvedStatus === 'out' ? styles.spiceStatusBtnOutActive : ''}`}
                      onClick={() => onUpdateStockStatus(item.id, 'out')}
                      title="Đánh dấu Đã hết (chỉ đề xuất mua khi món cần dùng)"
                    >
                      Đã hết
                    </button>
                  </div>
                ) : (
                  <div className={styles.inventoryActions}>
                    <SaoButton
                      variant="ghost"
                      className={styles.qtyBtn}
                      onClick={() => onUpdateQty(item.id, -1)}
                      disabled={item.quantity <= 0}
                      style={{ opacity: item.quantity <= 0 ? 0.4 : 1, cursor: item.quantity <= 0 ? 'not-allowed' : 'pointer', padding: 0 }}
                    >
                      <Minus size={15} />
                    </SaoButton>
                    <div className={styles.qtyValue}>
                      {item.quantity}
                      <span className={styles.qtyUnit}>{item.unit}</span>
                    </div>
                    <SaoButton
                      variant="ghost"
                      className={styles.qtyBtn}
                      onClick={() => onUpdateQty(item.id, 1)}
                      style={{ padding: 0 }}
                    >
                      <Plus size={15} />
                    </SaoButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB Quét hóa đơn & Thêm kho */}
      <div className={styles.inventoryFabGroup}>
        {isFabExpanded && (
          <>
            <label className={styles.scanFabLabel} title="Chụp ảnh hóa đơn qua camera" style={{ marginBottom: 0 }}>
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
            <label className={styles.scanFabLabel} title="Tải ảnh hóa đơn từ máy" style={{ marginBottom: 0 }}>
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
              title="Thêm thủ công vào kho"
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
          title="Tùy chọn nhập kho"
        >
          <Plus size={26} style={{ transform: isFabExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s' }} />
        </SaoButton>
      </div>
    </div>
  );
}
