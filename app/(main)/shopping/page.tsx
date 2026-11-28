"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Plus, CheckSquare, Clock, Award, CheckCircle2 } from 'lucide-react';
import SaoLoading from '@/app/components/SaoLoading';
import SaoTabs from '@/app/components/SaoTabs';
import SaoSearchInput from '@/app/components/SaoSearchInput';
import SaoSummaryCard from '@/app/components/SaoSummaryCard';
import SaoConfirmModal from '@/app/components/SaoConfirmModal';
import SaoFab from '@/app/components/SaoFab';
import ShoppingItemCard from '@/app/components/shopping/ShoppingItemCard';
import ShoppingAddModal from '@/app/components/shopping/ShoppingAddModal';
import ShoppingPurchaseModal, { WalletOption } from '@/app/components/shopping/ShoppingPurchaseModal';
import { useSaoAlert } from '../../contexts/AlertContext';
import { getShoppingItems, createShoppingItem, updateShoppingItem, deleteShoppingItem, purchaseShoppingItem } from './api';
import { getWallets } from '../finance/api';
import { GroceryItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import styles from './shopping.module.css';

type CategoryType = 'all' | 'food' | 'household' | 'other';
type StatusFilterType = 'all' | 'pending' | 'completed';

export default function ShoppingPage() {
  const { t } = useI18n();
  const { showAlert } = useSaoAlert();

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemToPurchase, setItemToPurchase] = useState<GroceryItem | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>([]);

  useEffect(() => {
    fetchItems();
    fetchWallets();
    const handleShoppingUpdate = () => fetchItems(true);
    const handleFinanceUpdate = () => fetchWallets(true);
    window.addEventListener('sao-shopping-updated', handleShoppingUpdate);
    window.addEventListener('sao-finance-updated', handleFinanceUpdate);
    return () => {
      window.removeEventListener('sao-shopping-updated', handleShoppingUpdate);
      window.removeEventListener('sao-finance-updated', handleFinanceUpdate);
    };
  }, []);

  const fetchWallets = async (force = false) => {
    try {
      const data: any = await getWallets(force);
      setWallets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async (force = false) => {
    try {
      const data: any = await getShoppingItems(force);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: check if checked item was bought more than 24h ago
  const isOlderThan24h = (item: GroceryItem): boolean => {
    if (!item.checked) return false;
    const timeStr = item.checkedAt || item.updatedAt;
    if (!timeStr) return false;
    const time = new Date(timeStr).getTime();
    return time > 0 && Date.now() - time > 24 * 60 * 60 * 1000;
  };

  // Active items (excluding completed items older than 24h)
  const activeItems = useMemo(() => {
    return items.filter(item => !isOlderThan24h(item));
  }, [items]);

  // Counts for stats header
  const totalCount = activeItems.length;
  const completedCount = useMemo(() => activeItems.filter(i => i.checked).length, [activeItems]);
  const pendingCount = useMemo(() => activeItems.filter(i => !i.checked).length, [activeItems]);
  const progressPercent = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  const pendingFood = useMemo(() => activeItems.filter(i => !i.checked && i.category === 'food').length, [activeItems]);
  const pendingHousehold = useMemo(() => activeItems.filter(i => !i.checked && i.category === 'household').length, [activeItems]);

  // Filtered & Searched items
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return activeItems.filter(item => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'pending' && item.checked) return false;
      if (statusFilter === 'completed' && !item.checked) return false;

      // Search query
      if (query) {
        const itemName = (item.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!itemName.includes(query)) return false;
      }

      return true;
    }).sort((a, b) => {
      // Pending first, completed last
      if (a.checked !== b.checked) {
        return a.checked ? 1 : -1;
      }
      return 0;
    });
  }, [activeItems, activeCategory, statusFilter, searchQuery]);

  const toggleCheck = async (item: GroceryItem) => {
    try {
      await updateShoppingItem(item._id, { checked: !item.checked });
      fetchItems(true);
    } catch (err) {
      console.error(err);
      showAlert(t('common.error', 'Có lỗi xảy ra'));
    }
  };

  const handleAddItem = async (data: {
    name: string;
    quantity: number;
    unit: string;
    category: 'food' | 'household' | 'other';
  }) => {
    try {
      await createShoppingItem(data);
      fetchItems(true);
      showAlert(t('common.success', 'Đã thêm món hàng vào danh sách!'));
    } catch (err) {
      console.error(err);
      showAlert(t('common.error', 'Không thể thêm món hàng'));
    }
  };

  const handlePurchaseItem = async (
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
  ) => {
    try {
      const res: any = await purchaseShoppingItem(item._id, payload);
      fetchItems(true);
      fetchWallets(true);
      window.dispatchEvent(new Event('sao-inventory-updated'));
      window.dispatchEvent(new Event('sao-finance-updated'));
      showAlert(res?.message || `Đã mua "${item.name}" và cất vào kho!`);
    } catch (err: any) {
      console.error(err);
      showAlert(err?.response?.data?.error || err?.message || t('common.error', 'Không thể hoàn tất mua & cất kho'));
      throw err;
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteShoppingItem(itemToDelete);
      fetchItems(true);
      showAlert(t('common.deleteSuccess', 'Đã xóa khỏi danh sách'));
    } catch (err) {
      console.error(err);
      showAlert(t('common.error', 'Lỗi khi xóa'));
    } finally {
      setItemToDelete(null);
    }
  };

  const tabOptions = [
    { id: 'all', label: `${t('common.all')} (${totalCount})` },
    { id: 'food', label: `${t('shopping.foodTab')} (${activeItems.filter(i => i.category === 'food').length})` },
    { id: 'household', label: `${t('shopping.householdTab')} (${activeItems.filter(i => i.category === 'household').length})` },
    { id: 'other', label: `${t('shopping.otherTab')} (${activeItems.filter(i => i.category === 'other').length})` }
  ];

  return (
    <div className={styles.shoppingContainer}>
      {/* ========================================================
         1.A. BẢN DESKTOP: BỘ 3 THẺ TỔNG QUAN TIẾN ĐỘ ĐI CHỢ (ĐỒNG BỘ TASKS)
         ======================================================== */}
      <div className={styles.desktopStats}>
        <SaoSummaryCard
          title={t('shopping.pending', 'Cần mua')}
          amount={pendingCount}
          currency="món"
          icon={<Clock size={18} />}
          subText={pendingCount > 0 ? `${pendingFood} thực phẩm • ${pendingHousehold} gia dụng` : t('shopping.allBought', 'Đã mua đủ!')}
          variant="balance"
          onClick={() => setStatusFilter('pending')}
        />

        <SaoSummaryCard
          title={t('shopping.completed', 'Đã mua')}
          amount={completedCount}
          currency={`/${totalCount}`}
          icon={<CheckCircle2 size={18} />}
          subText={completedCount > 0 ? t('shopping.autoCleanupNotice', 'Tự xóa sau 24h') : 'Chưa có món nào'}
          variant="income"
          onClick={() => setStatusFilter('completed')}
        />

        <SaoSummaryCard
          title={t('tasks.progress', 'Tiến độ')}
          amount={`${Math.round(progressPercent)}%`}
          currency=""
          icon={<Award size={18} />}
          subText={`${completedCount}/${totalCount} món hoàn thành`}
          variant="primary"
          onClick={() => setStatusFilter('all')}
          className={styles.thirdMetricCard}
        />
      </div>

      {/* ========================================================
         1.B. BẢN MOBILE: KHUNG TỔNG HỢP 3 TRONG 1 COMPACT HUD (ĐỒNG BỘ TASKS)
         ======================================================== */}
      <div className={styles.mobileStatsCard}>
        {/* Cột 1: Cần mua */}
        <div
          className={`${styles.mobileStatCol} ${statusFilter === 'pending' ? styles.colActivePending : ''}`}
          onClick={() => setStatusFilter('pending')}
          role="button"
          tabIndex={0}
        >
          <div className={`${styles.mobileStatHeader} ${styles.headerPending}`}>
            <Clock size={12} />
            <span>{t('shopping.pending', 'Cần mua')}</span>
          </div>
          <div className={styles.mobileStatBody}>
            <span className={styles.mobileStatVal}>{pendingCount}</span>
            <span className={styles.mobileStatUnit}>món</span>
          </div>
          <div className={styles.mobileStatSubPending}>
            {pendingCount > 0 ? `${pendingCount} món chưa mua` : 'Đã mua hết'}
          </div>
        </div>

        <div className={styles.mobileStatDivider} />

        {/* Cột 2: Đã mua */}
        <div
          className={`${styles.mobileStatCol} ${statusFilter === 'completed' ? styles.colActiveCompleted : ''}`}
          onClick={() => setStatusFilter('completed')}
          role="button"
          tabIndex={0}
        >
          <div className={`${styles.mobileStatHeader} ${styles.headerCompleted}`}>
            <CheckSquare size={12} />
            <span>{t('shopping.completed', 'Đã mua')}</span>
          </div>
          <div className={styles.mobileStatBody}>
            <span className={`${styles.mobileStatVal} ${styles.valCompleted}`}>{completedCount}</span>
            <span className={styles.mobileStatUnit}>/{totalCount}</span>
          </div>
          <div className={styles.mobileStatSubCompleted}>
            {t('shopping.autoCleanupNotice', 'Tự xóa sau 24h')}
          </div>
        </div>

        <div className={styles.mobileStatDivider} />

        {/* Cột 3: Tiến độ */}
        <div
          className={`${styles.mobileStatCol} ${statusFilter === 'all' ? styles.colActivePrimary : ''}`}
          onClick={() => setStatusFilter('all')}
          role="button"
          tabIndex={0}
        >
          <div className={`${styles.mobileStatHeader} ${styles.headerPrimary}`}>
            <Award size={12} />
            <span>{t('tasks.progress', 'Tiến độ')}</span>
          </div>
          <div className={styles.mobileStatBody}>
            <span className={styles.mobileStatVal}>{Math.round(progressPercent)}%</span>
          </div>
          <div className={styles.mobileStatSubPrimary}>{completedCount}/{totalCount} xong</div>
        </div>

        {/* Họa tiết SAO: Góc trên - trái (Diamond + Hairline) */}
        <div className={styles.cardCornerTL} aria-hidden="true">
          <div className={styles.cardDiamondTL} />
          <div className={styles.cardLineTL} />
        </div>

        {/* Họa tiết SAO: Góc dưới - phải (Diamond + Hairline) */}
        <div className={styles.cardCornerBR} aria-hidden="true">
          <div className={styles.cardDiamondBR} />
          <div className={styles.cardLineBR} />
        </div>
      </div>

      {/* ========================================================
         2. THANH DANH MỤC & CÔNG CỤ (TABS + SEARCH + BỘ LỌC TRẠNG THÁI)
         ======================================================== */}
      <div className={styles.toolbar}>
        <SaoTabs
          tabs={tabOptions}
          activeTab={activeCategory}
          onChange={(id) => setActiveCategory(id as CategoryType)}
        />

        <div className={styles.filtersRow}>
          <div className={styles.searchBox}>
            <SaoSearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('shopping.searchPlaceholder', 'Tìm kiếm món đồ cần mua...')}
              onClear={() => setSearchQuery('')}
            />
          </div>

          <div className={styles.statusFilters}>
            <button
              type="button"
              className={`${styles.statusPill} ${statusFilter === 'all' ? styles.statusPillActive : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              {t('common.all', 'Tất cả')}
            </button>
            <button
              type="button"
              className={`${styles.statusPill} ${statusFilter === 'pending' ? styles.statusPillActive : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              {t('shopping.pending', 'Cần mua')} ({pendingCount})
            </button>
            <button
              type="button"
              className={`${styles.statusPill} ${statusFilter === 'completed' ? styles.statusPillActive : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              {t('shopping.completed', 'Đã mua')} ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
         3. DANH SÁCH MÓN ĐỒ ĐI CHỢ (GROCERY LIST)
         ======================================================== */}
      <div className={styles.groceryList}>
        {isLoading ? (
          <SaoLoading fullPage />
        ) : filteredItems.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconBox}>
              <ShoppingCart size={38} />
            </div>
            <p className={styles.emptyTitle}>
              {searchQuery
                ? t('shopping.noSearchResult', 'Không tìm thấy món hàng phù hợp với từ khóa')
                : statusFilter === 'completed' && completedCount === 0
                ? t('shopping.noCompleted', 'Chưa có món nào được đánh dấu đã mua')
                : statusFilter === 'pending' && totalCount > 0
                ? t('shopping.allBought', 'Tuyệt vời! Bạn đã mua đủ tất cả món hàng!')
                : t('shopping.empty')}
            </p>
            <p className={styles.emptySubTitle}>
              {searchQuery
                ? t('shopping.tryOtherSearch', 'Thử tìm với tên hoặc từ khóa khác')
                : t('shopping.addItemHint', 'Nhấn nút bên dưới hoặc nút dấu cộng để thêm món đồ cần mua')}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <ShoppingItemCard
              key={item._id}
              item={item}
              onToggleCheck={toggleCheck}
              onPurchase={(it) => setItemToPurchase(it)}
              onDelete={(id) => setItemToDelete(id)}
            />
          ))
        )}
      </div>

      {/* ========================================================
         NÚT THÊM MÓN ĐỒ DẠNG ICON TRÒN NỔI BÊN DƯỚI (SAO FAB)
         ======================================================== */}
      <SaoFab
        title={t('shopping.addItem')}
        onClick={() => setIsAddModalOpen(true)}
        position="fixed"
      />

      {/* ========================================================
         4. MODAL: THÊM MỚI MÓN ĐỒ (SHOPPING ADD MODAL)
         ======================================================== */}
      <ShoppingAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
      />

      {/* ========================================================
         5. MODAL: MUA & CẤT KHO 1 CHẠM (v1.1)
         ======================================================== */}
      <ShoppingPurchaseModal
        item={itemToPurchase}
        wallets={wallets}
        onClose={() => setItemToPurchase(null)}
        onConfirm={handlePurchaseItem}
      />

      {/* ========================================================
         6. MODAL: XÁC NHẬN XÓA (SAO CONFIRM MODAL)
         ======================================================== */}
      <SaoConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteItem}
        title={t('shopping.confirmDeleteTitle')}
        message={t('shopping.deleteItemDesc')}
      />
    </div>
  );
}
