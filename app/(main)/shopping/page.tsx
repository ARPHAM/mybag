"use client";

import { useState, useEffect } from 'react';
import { ShoppingCart, Check, Plus, Trash2, Apple, Home as HomeIcon, Package, AlertTriangle, PackagePlus, Wallet as WalletIcon } from 'lucide-react';
import styles from './shopping.module.css';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoLoading from '../../components/SaoLoading/SaoLoading';
import SaoTabs from '../../components/SaoTabs/SaoTabs';
import SaoSelect from '../../components/SaoSelect/SaoSelect';
import SaoInput from '../../components/SaoInput/SaoInput';
import SaoButton from '../../components/SaoButton/SaoButton';
import SaoDatePicker from '../../components/SaoDatePicker/SaoDatePicker';
import { useSaoAlert } from '../../contexts/AlertContext';
import { getShoppingItems, createShoppingItem, updateShoppingItem, deleteShoppingItem } from './api';
import { getWallets, createInventory } from '../finance/api';

type CategoryType = 'all' | 'food' | 'household' | 'other';

import { GroceryItem, WalletSource } from '@/lib/types';
import { GROCERY_CATEGORY_OPTIONS } from '@/lib/constants';

export default function ShoppingPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [wallets, setWallets] = useState<WalletSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'food' | 'household' | 'other'>('all');

  const { showAlert } = useSaoAlert();

  useEffect(() => {
    fetchItems();
    fetchWallets();
  }, []);

  const fetchItems = async (force = false) => {
    try {
      const data: any = await getShoppingItems(force);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const data: any = await getWallets();
      setWallets(data || []);
    } catch (err) {
      console.error("Error fetching wallets:", err);
    }
  };
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'cái',
    category: 'food' as 'food' | 'household' | 'other'
  });

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Transfer to Inventory Modal state
  const [inventoryItem, setInventoryItem] = useState<GroceryItem | null>(null);
  const [invData, setInvData] = useState({
    name: '',
    quantity: 1,
    unit: 'kg',
    category: 'food',
    totalValue: 0,
    wallet_id: '',
    isGift: false,
    expiryDate: ''
  });
  const [isTransferring, setIsTransferring] = useState(false);

  const filteredItems = items.filter(
    item => activeTab === 'all' || item.category === activeTab
  );

  const toggleCheck = async (item: GroceryItem) => {
    try {
      await updateShoppingItem(item._id, { checked: !item.checked });
      fetchItems(true);
    } catch (err) {
      console.error(err);
    }
  };

  const openInventoryModal = (e: React.MouseEvent, item: GroceryItem) => {
    e.stopPropagation();
    setInventoryItem(item);
    setInvData({
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || 'kg',
      category: item.category === 'household' ? 'utilities' : 'food',
      totalValue: 0,
      wallet_id: wallets[0]?.id || '',
      isGift: false,
      expiryDate: ''
    });
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryItem) return;

    if (!invData.isGift && invData.totalValue > 0 && !invData.wallet_id) {
      showAlert("Vui lòng chọn ví thanh toán để trừ tiền!");
      return;
    }

    setIsTransferring(true);
    try {
      await createInventory({
        name: invData.name,
        category: invData.category,
        quantity: Number(invData.quantity),
        unit: invData.unit,
        totalValue: invData.isGift ? 0 : Number(invData.totalValue),
        wallet_id: invData.isGift ? undefined : invData.wallet_id,
        isGift: invData.isGift,
        expiryDate: invData.expiryDate || undefined
      });

      // Mark shopping item as checked
      await updateShoppingItem(inventoryItem._id, { checked: true });

      showAlert(`Đã nhập "${invData.name}" vào Kho dự trữ và ghi chép chi tiêu!`);
      setInventoryItem(null);
      fetchItems(true);
    } catch (err: any) {
      console.error(err);
      showAlert(err.response?.data?.error || "Lỗi khi nhập kho");
    } finally {
      setIsTransferring(false);
    }
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteShoppingItem(itemToDelete);
        fetchItems(true);
      } catch (err) {
        console.error(err);
      }
      setItemToDelete(null);
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', quantity: 1, unit: 'cái', category: 'food' });
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await createShoppingItem(formData);
      fetchItems();
    } catch (err) {
      console.error(err);
    }
    
    setIsAddModalOpen(false);
  };

  const completedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return <Apple size={16} color="#00ffaa" />;
      case 'household': return <HomeIcon size={16} color="#00f0ff" />;
      default: return <Package size={16} color="#a0c4ff" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'food': return 'Thực phẩm';
      case 'household': return 'Đồ dùng';
      default: return 'Khác';
    }
  };

  const tabOptions = [
    { id: 'all', label: `Tất cả (${totalCount})` },
    { id: 'food', label: 'Thực phẩm' },
    { id: 'household', label: 'Đồ dùng' },
    { id: 'other', label: 'Khác' }
  ];

  const walletSelectOptions = wallets.map(w => ({
    value: w.id,
    label: `${w.name} (${w.balance.toLocaleString('vi-VN')} VND)`
  }));

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <ShoppingCart className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>Danh Sách Mua Sắm</h1>
        </div>

        {/* PROGRESS BAR */}
        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Tiến độ mua sắm</span>
            <span className={styles.progressValue}>{completedCount}/{totalCount} ({Math.round(progressPercent)}%)</span>
          </div>
          <div className={styles.progressBarBg}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <SaoTabs
        tabs={tabOptions}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as CategoryType)}
      />

      {/* GROCERY LIST */}
      <div className={styles.groceryList}>
        {isLoading ? (
          <SaoLoading fullPage />
        ) : (
          filteredItems.map(item => (
            <div 
              key={item._id} 
              className={`${styles.groceryItem} ${item.checked ? styles.checked : ''}`}
              onClick={() => toggleCheck(item)}
            >
              <div className={styles.itemCheckBtn}>
                <Check size={16} className={styles.checkIcon} strokeWidth={3} />
              </div>
            
              <div className={styles.itemContent}>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemDetails}>
                  <span>
                    {getCategoryIcon(item.category)} {getCategoryLabel(item.category)}
                  </span>
                  <span>
                    • Số lượng dự kiến: {item.quantity} {item.unit}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                {!item.checked && (
                  <SaoButton
                    variant="ghost"
                    onClick={(e) => openInventoryModal(e, item)}
                    title="Đã mua -> Chuyển vào Kho dự trữ & Ghi chi tiêu"
                    style={{ color: '#00ffaa', borderColor: 'rgba(0, 255, 170, 0.4)' }}
                  >
                    <PackagePlus size={16} style={{ marginRight: 4 }} />
                    <span className="hidden sm:inline">Nhập kho</span>
                  </SaoButton>
                )}

                <SaoButton
                  variant="ghost"
                  ghostType="danger"
                  onClick={(e) => confirmDelete(e, item._id)}
                  title="Xóa"
                >
                  <Trash2 size={16} />
                </SaoButton>
              </div>
            </div>
          ))
        )}
        
        <SaoButton variant="dashed" onClick={openAddModal}>
          <Plus size={20} /> Thêm vào danh sách
        </SaoButton>
      </div>

      {/* MODAL: THÊM MỚI */}
      <SaoModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Thêm Mục Mới" 
        icon={<Plus size={20} />}
      >
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label>Tên mặt hàng</label>
            <SaoInput
              type="text"
              placeholder="Vd: Thịt heo, sữa..."
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              autoFocus
            />
          </div>

          <div className={styles.flexRow}>
            <div className={styles.formGroup}>
              <label>Số lượng</label>
              <SaoInput
                type="number"
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Đơn vị</label>
              <SaoInput
                type="text"
                placeholder="kg, lít, cái..."
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Danh mục</label>
            <SaoSelect
              options={GROCERY_CATEGORY_OPTIONS}
              initialValue={formData.category}
              onChange={val => setFormData({...formData, category: val as 'food' | 'household' | 'other'})}
            />
          </div>

          <div className={styles.modalFooter}>
            <SaoButton variant="default" onClick={() => setIsAddModalOpen(false)} type="button">
              Hủy bỏ
            </SaoButton>
            <SaoButton variant="primary" type="submit">
              Thêm
            </SaoButton>
          </div>
        </form>
      </SaoModal>

      {/* MODAL: NHẬP KHO DỰ TRỮ (INVENTORY TRANSFER) */}
      <SaoModal
        isOpen={!!inventoryItem}
        onClose={() => setInventoryItem(null)}
        title="Xác nhận mua & Nhập vào Kho dự trữ"
        icon={<PackagePlus size={20} color="#00ffaa" />}
      >
        <form onSubmit={handleConfirmTransfer}>
          <div style={{ color: '#a0c4ff', fontSize: '0.85rem', marginBottom: '14px', lineHeight: 1.4 }}>
            Nhập số lượng và chi phí thực tế tại chợ để đưa món đồ này vào Kho dự trữ và tự động ghi chép chi tiêu tài chính.
          </div>

          <div className={styles.formGroup}>
            <label>Tên mặt hàng</label>
            <SaoInput
              type="text"
              value={invData.name}
              onChange={e => setInvData({ ...invData, name: e.target.value })}
              required
            />
          </div>

          <div className={styles.flexRow}>
            <div className={styles.formGroup}>
              <label>Số lượng thực mua</label>
              <SaoInput
                type="number"
                min="0.1"
                step="any"
                value={invData.quantity}
                onChange={e => setInvData({ ...invData, quantity: Number(e.target.value) })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Đơn vị tính</label>
              <SaoInput
                type="text"
                placeholder="kg, lít, hộp, bó..."
                value={invData.unit}
                onChange={e => setInvData({ ...invData, unit: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Toggle Gift / Free */}
          <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={invData.isGift}
                onChange={e => setInvData({ ...invData, isGift: e.target.checked })}
                className="accent-cyan-400"
              />
              Được tặng / Miễn phí (không trừ tiền ví)
            </label>
          </div>

          {!invData.isGift && (
            <>
              <div className={styles.formGroup}>
                <label>Tổng tiền thực tế đã chi (VND)</label>
                <SaoInput
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="VD: 45000"
                  value={invData.totalValue}
                  onChange={e => setInvData({ ...invData, totalValue: Number(e.target.value) })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Ví thanh toán</label>
                {wallets.length === 0 ? (
                  <div style={{ color: '#f59e0b', fontSize: '0.85rem' }}>Chưa có ví nào trong hệ thống</div>
                ) : (
                  <SaoSelect
                    options={walletSelectOptions}
                    initialValue={invData.wallet_id || wallets[0]?.id}
                    onChange={val => setInvData({ ...invData, wallet_id: val })}
                  />
                )}
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label>Hạn sử dụng (Tùy chọn)</label>
            <SaoDatePicker
              value={invData.expiryDate}
              onChange={val => setInvData({ ...invData, expiryDate: val })}
              placeholder="Chọn ngày hết hạn..."
            />
          </div>

          <div className={styles.modalFooter}>
            <SaoButton variant="default" onClick={() => setInventoryItem(null)} type="button">
              Hủy
            </SaoButton>
            <SaoButton variant="primary" type="submit" disabled={isTransferring}>
              {isTransferring ? 'Đang nhập kho...' : 'Xác nhận nhập kho'}
            </SaoButton>
          </div>
        </form>
      </SaoModal>

      {/* MODAL: XÓA ITEM */}
      <SaoModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Xác nhận xóa"
        icon={<AlertTriangle size={20} />}
      >
        <div className={styles.confirmText}>
          Bạn có chắc chắn muốn xóa mục này khỏi danh sách không?
        </div>
        <div className={styles.modalFooter}>
          <SaoButton variant="default" onClick={() => setItemToDelete(null)} type="button">
            Hủy
          </SaoButton>
          <SaoButton variant="danger" onClick={handleDelete} type="button">
            <Trash2 size={16} /> Xóa
          </SaoButton>
        </div>
      </SaoModal>
    </div>
  );
}
