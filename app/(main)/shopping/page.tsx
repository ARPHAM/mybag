"use client";

import { useState, useEffect } from 'react';
import { ShoppingCart, Check, Plus, Trash2, Apple, Home as HomeIcon, Package, AlertTriangle } from 'lucide-react';
import styles from './shopping.module.css';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoTabs from '../../components/SaoTabs/SaoTabs';

type CategoryType = 'all' | 'food' | 'household' | 'other';

interface GroceryItem {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'food' | 'household' | 'other';
  checked: boolean;
}

export default function ShoppingPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'food' | 'household' | 'other'>('all');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/shopping');
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
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

  const filteredItems = items.filter(
    item => activeTab === 'all' || item.category === activeTab
  );

  const toggleCheck = async (item: GroceryItem) => {
    try {
      await fetch(`/api/shopping/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: !item.checked }),
      });
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      try {
        await fetch(`/api/shopping/${itemToDelete}`, { method: 'DELETE' });
        fetchItems();
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
      await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
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
    switch(category) {
      case 'food': return <Apple size={16} />;
      case 'household': return <HomeIcon size={16} />;
      default: return <Package size={16} />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch(category) {
      case 'food': return 'Thực phẩm';
      case 'household': return 'Đồ gia dụng';
      default: return 'Khác';
    }
  };

  return (
    <div className={styles.shoppingContainer}>
      {/* HEADER SECTION */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <ShoppingCart className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>Danh Sách Cần Mua</h1>
        </div>

        <div className={styles.progressSection}>
          <span className={styles.progressText}>
            Tiến độ: {completedCount}/{totalCount}
          </span>
          <div className={styles.progressBarWrapper}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* TABS (SAO Style) */}
      <SaoTabs
        tabs={[
          { id: 'all', label: 'Tất cả' },
          { id: 'food', label: 'Thực Phẩm' },
          { id: 'household', label: 'Đồ Gia Dụng' },
          { id: 'other', label: 'Khác' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as CategoryType)}
      />

      {/* GROCERY LIST */}
      <div className={styles.groceryList}>
        {isLoading ? (
          <div style={{color: '#fff', textAlign: 'center', marginTop: '20px'}}>Đang tải danh sách...</div>
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
                  • Số lượng: {item.quantity} {item.unit}
                </span>
              </div>
            </div>

            <button 
              className={styles.deleteBtn}
              onClick={(e) => confirmDelete(e, item._id)}
              title="Xóa món"
            >            
              <Trash2 size={20} />
            </button>
          </div>
        )))}
        
        <button className={styles.addButton} onClick={openAddModal}>
          <Plus size={20} /> Thêm Mục Mới
        </button>
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
            <input 
              type="text" 
              className={styles.input}
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
              <input 
                type="number" 
                className={styles.input}
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Đơn vị</label>
              <input 
                type="text" 
                className={styles.input}
                placeholder="kg, lít, cái..."
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Danh mục</label>
            <select 
              className={styles.select}
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value as 'food' | 'household' | 'other'})}
            >
              <option value="food">Thực phẩm</option>
              <option value="household">Đồ gia dụng</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={`${styles.btn} ${styles.cancelBtn}`} onClick={() => setIsAddModalOpen(false)}>
              Hủy bỏ
            </button>
            <button type="submit" className={`${styles.btn} ${styles.saveBtn}`}>
              Thêm
            </button>
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
          <button type="button" className={`${styles.btn} ${styles.cancelBtn}`} onClick={() => setItemToDelete(null)}>
            Hủy
          </button>
          <button type="button" className={`${styles.btn} ${styles.deleteBtnConfirm}`} onClick={handleDelete}>
            <Trash2 size={16} /> Xóa
          </button>
        </div>
      </SaoModal>

    </div>
  );
}
