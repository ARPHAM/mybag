"use client";

import { useState, useEffect } from 'react';
import SaoModal from '@/app/components/SaoModal';
import { useSaoAlert } from '../../contexts/AlertContext';
import SaoLoading from '@/app/components/SaoLoading';
import SaoTabs from '@/app/components/SaoTabs';
import SaoFab from '@/app/components/SaoFab';
import SaoConfirmModal from '@/app/components/SaoConfirmModal';
import {
  getRecipes, getMeals, getInventory, calculateMacros, createRecipe, updateRecipe, deleteRecipe,
  createMeal, getWallets, updateMeal, deleteMeal,
  createInventory, updateInventory, deleteInventory, cleanupExpiredInventory, createTransaction
} from './api';
import InventoryTab from '@/app/components/menu/InventoryTab';
import MealHistoryTab from '@/app/components/menu/MealHistoryTab';
import RecipesTab from '@/app/components/menu/RecipesTab';
import MealModal from '@/app/components/menu/MealModal';
import RecipeModal from '@/app/components/menu/RecipeModal';
import InventoryModal from '@/app/components/menu/InventoryModal';
import BillScanReviewModal from '@/app/components/menu/BillScanReviewModal';
import styles from './menu.module.css';

import { MenuTabId, Recipe, MealRecord, MealIngredientUsed, InventoryItem } from '@/lib/types';
import {
  MENU_TABS,
  INVENTORY_CATEGORY_OPTIONS,
  INVENTORY_UNIT_OPTIONS,
  getMenuTabs,
  getInventoryCategoryOptions
} from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { convertQtyToInventoryUnit, parseRecipeIngredientString, isSpiceIngredient } from '@/lib/unitHelper';

interface Wallet {
  _id: string;
  name: string;
  balance: number;
}

function toVnDateString(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }
}

export default function MenuPage() {
  const { t, language } = useI18n();
  const { showAlert } = useSaoAlert();
  // Ưu tiên hiển thị Lịch sử bữa ăn trước tiên, công thức và kho đồ là các tab kế bên
  const [activeTab, setActiveTab] = useState<MenuTabId>('history');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'cook' | 'recipe' | 'meal' | 'inventory' | 'scan_bill_review'>('meal');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [mealsDays, setMealsDays] = useState<'7' | '14' | '30' | 'all'>('7');
  const [mealsSearch, setMealsSearch] = useState('');
  const [isMealsLoading, setIsMealsLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Meal & Recipe Form states
  const [formName, setFormName] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formCookSource, setFormCookSource] = useState<'home' | 'eat_out'>('home');
  const [formDate, setFormDate] = useState(toVnDateString());
  const [formActualIngredients, setFormActualIngredients] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formWalletId, setFormWalletId] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<MealIngredientUsed[]>([]);
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);
  const [formImageUrl, setFormImageUrl] = useState<string>('');

  // Inventory Form states
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);
  const [inventoryToDelete, setInventoryToDelete] = useState<string | null>(null);
  const [isInventoryFabExpanded, setIsInventoryFabExpanded] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    category: 'food',
    stock_status: 'stable' as 'stable' | 'low' | 'out',
    quantity: '1',
    unit: 'kg',
    purchaseDate: toVnDateString(),
    expiryDate: '',
    isGift: false,
    totalValue: '',
    wallet_id: ''
  });

  // AI Scan Bill states
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [scannedBillItems, setScannedBillItems] = useState<any[]>([]);
  const [billWalletId, setBillWalletId] = useState('');

  useEffect(() => {
    fetchData(true);
    const handleUpdate = () => fetchData(true, true);
    window.addEventListener('sao-menu-updated', handleUpdate);
    window.addEventListener('sao-inventory-updated', handleUpdate);
    return () => {
      window.removeEventListener('sao-menu-updated', handleUpdate);
      window.removeEventListener('sao-inventory-updated', handleUpdate);
    };
  }, []);

  const fetchMeals = async (days = mealsDays, search = mealsSearch, force = false) => {
    try {
      setIsMealsLoading(true);
      const resM: any = await getMeals({ days, search, force });
      if (resM) setMeals(resM);
    } catch (e) {
      console.error(e);
    } finally {
      setIsMealsLoading(false);
    }
  };

  const fetchData = async (force = false, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [resR, resM, resI, resW]: any = await Promise.all([
        getRecipes(force),
        getMeals({ days: mealsDays, search: mealsSearch, force }),
        getInventory(force),
        getWallets(force)
      ]);
      if (resR) setRecipes(resR);
      if (resM) setMeals(resM);
      if (resI) setInventory(resI.map((i: any) => ({ ...i, id: i._id })));
      if (resW) setWallets(resW.map((w: any) => ({ ...w, _id: w._id || w.id, id: w._id || w.id })));
    } catch (e) {
      console.error(e);
    }
    if (!silent) setLoading(false);
  };

  const formatMoney = (n: number) => n.toLocaleString('vi-VN');

  /**
   * Bóc tách ghi chú thủ công của người dùng, loại bỏ phần autoContext
   */
  const extractCleanManualNote = (meal: MealRecord): string => {
    const raw = meal.ingredients_text?.trim();
    if (!raw) return '';
    if (raw.includes('. Bổ sung: ')) {
      const parts = raw.split('. Bổ sung: ');
      return parts[parts.length - 1].trim();
    }
    if (meal.source === 'home' && meal.ingredients_used && meal.ingredients_used.length > 0) {
      const autoTokens = meal.ingredients_used.map(ing => {
        const invItem = inventory.find(i => i.id === ing.invId);
        const name = ing.name || invItem?.name || '';
        const unit = ing.unit || invItem?.unit || '';
        return name ? `${ing.qty}${unit} ${name}` : '';
      }).filter(Boolean);

      if (autoTokens.length > 0) {
        let remainder = raw;
        for (const token of autoTokens) {
          remainder = remainder.replace(token, '');
        }
        remainder = remainder.replace(/^[\s,.;]+|[\s,.;]+$/g, '');
        if (!remainder) return '';
      }
    }
    return raw;
  };

  /**
   * Tính toán lượng tồn kho khả dụng và giá trị kho khả dụng cho từng nguyên liệu (invId).
   */
  const getIngredientPoolInfo = (invId: string) => {
    const invItem = inventory.find(i => i.id === invId);
    const currentStock = invItem ? Number(invItem.quantity) || 0 : 0;
    const currentVal = invItem ? Number(invItem.totalValue) || 0 : 0;

    let oldHeldQty = 0;
    let oldHeldCost = 0;
    let snapshotName = invItem?.name;
    let snapshotUnit = invItem?.unit;

    if (editingMeal && editingMeal.source === 'home' && Array.isArray(editingMeal.ingredients_used)) {
      const matchingOld = editingMeal.ingredients_used.filter(u => u.invId === invId);
      for (const u of matchingOld) {
        const q = Number(u.qty) || 0;
        oldHeldQty = Number((oldHeldQty + q).toFixed(4));
        if (u.name) snapshotName = u.name;
        if (u.unit) snapshotUnit = u.unit;

        if (typeof u.cost === 'number' && u.cost > 0) {
          oldHeldCost += u.cost;
        } else if (invItem?.originalValue && invItem?.originalQuantity && invItem.originalQuantity > 0) {
          oldHeldCost += Math.round((invItem.originalValue / invItem.originalQuantity) * q);
        } else if (editingMeal.ingredients_used.length === 1 && (editingMeal.cost || 0) > 0) {
          oldHeldCost += editingMeal.cost || 0;
        } else if (currentStock > 0 && currentVal > 0) {
          oldHeldCost += Math.round((currentVal / currentStock) * q);
        }
      }
    }

    const effectivePoolQty = Number((currentStock + oldHeldQty).toFixed(4));
    const origCap = invItem?.originalValue || 0;
    const rawPoolVal = Math.round(currentVal + oldHeldCost);
    const effectivePoolValue = origCap > 0 && effectivePoolQty <= (invItem?.originalQuantity || effectivePoolQty)
      ? Math.min(origCap, rawPoolVal)
      : rawPoolVal;

    return {
      invItem,
      name: snapshotName || 'Nguyên liệu (đã xóa khỏi kho)',
      unit: snapshotUnit || 'phần',
      currentStock,
      oldHeldQty,
      oldHeldCost,
      effectivePoolQty,
      effectivePoolValue,
      isDeletedFromInventory: !invItem
    };
  };

  const estimateIngredientCost = (invId: string, qty: number): number => {
    const q = Number(qty) || 0;
    if (!invId || q <= 0) return 0;
    const pool = getIngredientPoolInfo(invId);
    if (pool.effectivePoolQty <= 0 || pool.effectivePoolValue <= 0) return 0;
    const actualQty = Math.min(pool.effectivePoolQty, q);
    if (actualQty >= pool.effectivePoolQty - 1e-6) {
      return Math.round(pool.effectivePoolValue);
    }
    return Math.min(
      Math.round(pool.effectivePoolValue),
      Math.round((pool.effectivePoolValue / pool.effectivePoolQty) * actualQty)
    );
  };

  const estimatedHomeTotalCost = (() => {
    if (formCookSource !== 'home' || selectedIngredients.length === 0) return 0;
    const grouped = new Map<string, number>();
    for (const ing of selectedIngredients) {
      const q = Number(ing.qty) || 0;
      if (ing.invId && q > 0) {
        grouped.set(ing.invId, Number(((grouped.get(ing.invId) || 0) + q).toFixed(4)));
      }
    }
    let total = 0;
    for (const [invId, totalQty] of grouped.entries()) {
      total += estimateIngredientCost(invId, totalQty);
    }
    return total;
  })();

  // Mở modal nấu ăn từ công thức có sẵn
  const openCookModal = (recipe: Recipe) => {
    setEditingMeal(null);
    setEditingRecipe(recipe);
    setFormName(recipe.name);
    setFormActualIngredients('');
    setModalType('cook');
    setFormCookSource('home');
    setFormDate(toVnDateString());
    setFormCost('');
    setFormWalletId('');
    setFormImageUrl('');

    // Chỉ lấy các nguyên liệu thực phẩm (loại trừ gia vị và đồ dùng)
    const availableInventory = inventory.filter(i =>
      (i.category === 'food' || !i.category) &&
      i.category !== 'spices' &&
      i.category !== 'utilities' &&
      !isSpiceIngredient(i.name) &&
      i.quantity > 0
    );
    const matched: MealIngredientUsed[] = [];
    const usedIds = new Set<string>();
    recipe.ingredients.forEach(ingName => {
      const parsed = parseRecipeIngredientString(ingName);
      const searchName = (parsed.cleanName || ingName).toLowerCase();

      // Nếu nguyên liệu trong công thức là gia vị -> KHÔNG MAP vào danh sách trừ kho
      if (isSpiceIngredient(searchName) || isSpiceIngredient(ingName)) {
        return;
      }

      const match = availableInventory.find(
        i => !usedIds.has(i.id) && (
          i.name.toLowerCase().includes(searchName) ||
          searchName.includes(i.name.toLowerCase()) ||
          i.name.toLowerCase().includes(ingName.toLowerCase()) ||
          ingName.toLowerCase().includes(i.name.toLowerCase())
        )
      );
      if (match && match.category !== 'spices' && !isSpiceIngredient(match.name)) {
        usedIds.add(match.id);
        const defaultQty = parsed.qty && parsed.qty > 0
          ? convertQtyToInventoryUnit(parsed.qty, parsed.unit, match.unit, match.quantity)
          : 1;
        matched.push({
          invId: match.id,
          qty: Math.min(defaultQty, match.quantity),
          name: match.name,
          unit: match.unit
        });
      }
    });
    setSelectedIngredients(matched);
    setIsModalOpen(true);
  };

  const openGlobalAddModal = () => {
    setEditingMeal(null);
    setEditingRecipe(null);
    setEditingInventoryItem(null);

    if (activeTab === 'recipes') {
      setModalType('recipe');
      setFormName('');
      setFormIngredients('');
      setFormInstructions('');
      setIsModalOpen(true);
    } else if (activeTab === 'inventory') {
      openAddInventoryModal();
    } else {
      setModalType('meal');
      setFormName('');
      setFormActualIngredients('');
      setFormCookSource('home');
      setFormDate(toVnDateString());
      setFormCost('');
      setFormWalletId('');
      setSelectedIngredients([]);
      setFormImageUrl('');
      setIsModalOpen(true);
    }
  };

  const openEditMealModal = (meal: MealRecord) => {
    setEditingRecipe(null);
    setEditingMeal(meal);
    setModalType('meal');
    setFormName(meal.food_name);
    setFormCookSource(meal.source);
    setFormDate(toVnDateString(meal.consumed_at));
    setFormCost(meal.cost ? meal.cost.toString() : '');
    setFormWalletId(meal.wallet_id || '');
    setFormActualIngredients(extractCleanManualNote(meal));
    if (meal.source === 'home' && Array.isArray(meal.ingredients_used)) {
      setSelectedIngredients(
        meal.ingredients_used.map(ing => ({
          invId: ing.invId,
          qty: Number(ing.qty) || 0,
          cost: ing.cost,
          name: ing.name,
          unit: ing.unit
        }))
      );
    } else {
      setSelectedIngredients([]);
    }
    setFormImageUrl(meal.image_url || '');
    setIsModalOpen(true);
  };

  const confirmDeleteMeal = (id: string) => {
    setMealToDelete(id);
  };

  const handleDeleteMeal = async () => {
    if (!mealToDelete) return;
    try {
      await deleteMeal(mealToDelete);
      setMeals(meals.filter(m => m._id !== mealToDelete));
      setMealToDelete(null);
      fetchData(true, true);
      window.dispatchEvent(new Event('sao-user-updated'));
      window.dispatchEvent(new Event('sao-finance-updated'));
      window.dispatchEvent(new Event('sao-health-updated'));
    } catch (e) {
      showAlert("Lỗi xóa bữa ăn");
    }
  };

  // Inventory CRUD handlers
  const openAddInventoryModal = () => {
    setEditingInventoryItem(null);
    setInventoryForm({
      name: '',
      category: 'food',
      stock_status: 'stable',
      quantity: '1',
      unit: 'kg',
      purchaseDate: toVnDateString(),
      expiryDate: '',
      isGift: false,
      totalValue: '',
      wallet_id: ''
    });
    setModalType('inventory');
    setIsModalOpen(true);
  };

  const openEditInventoryModal = (item: InventoryItem) => {
    setEditingInventoryItem(item);
    setInventoryForm({
      name: item.name,
      category: item.category || 'food',
      stock_status: item.stock_status || (item.quantity <= 0 ? 'out' : item.quantity <= 2 ? 'low' : 'stable'),
      quantity: item.quantity !== undefined ? item.quantity.toString() : '1',
      unit: item.unit || 'kg',
      purchaseDate: item.purchaseDate ? toVnDateString(item.purchaseDate) : toVnDateString(),
      expiryDate: item.expiryDate ? toVnDateString(item.expiryDate) : '',
      isGift: !!item.isGift,
      totalValue: item.totalValue !== undefined && item.totalValue !== null ? item.totalValue.toString() : '',
      wallet_id: item.wallet_id || ''
    });
    setModalType('inventory');
    setIsModalOpen(true);
  };

  const handleUpdateInventoryQty = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newQty = Math.max(0, Number((item.quantity + delta).toFixed(4)));
    setInventory(inventory.map(i => i.id === id ? { ...i, quantity: newQty } : i));

    try {
      const res: any = await updateInventory(id, { justUpdateQty: true, quantity: newQty });
      if (res && res.data) {
        setInventory(prev => prev.map(i => i.id === id ? {
          ...i,
          quantity: res.data.quantity,
          totalValue: res.data.totalValue,
          originalQuantity: res.data.originalQuantity
        } : i));
      }
      window.dispatchEvent(new Event('sao-inventory-updated'));
      window.dispatchEvent(new Event('sao-finance-updated'));
    } catch (e) {
      fetchData(true, true);
    }
  };

  const handleUpdateStockStatus = async (id: string, status: 'stable' | 'low' | 'out') => {
    setInventory(prev => prev.map(i => i.id === id ? {
      ...i,
      stock_status: status,
      quantity: status === 'out' ? 0 : (i.quantity > 0 ? i.quantity : 1)
    } : i));

    try {
      await updateInventory(id, { justUpdateStockStatus: true, stock_status: status });
      window.dispatchEvent(new Event('sao-inventory-updated'));
      window.dispatchEvent(new Event('sao-finance-updated'));
    } catch (e) {
      showAlert("Lỗi cập nhật trạng thái gia vị");
      fetchData(true, true);
    }
  };

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isSpice = inventoryForm.category === 'spices';
      const parsedQty = parseFloat(inventoryForm.quantity);
      const defaultQty = isSpice && inventoryForm.stock_status === 'out' ? 0 : 1;

      const reqData = {
        name: inventoryForm.name.trim(),
        category: inventoryForm.category,
        stock_status: inventoryForm.stock_status,
        quantity: !isNaN(parsedQty) ? parsedQty : defaultQty,
        unit: inventoryForm.unit || (isSpice ? 'hộp' : 'kg'),
        purchaseDate: inventoryForm.purchaseDate,
        expiryDate: inventoryForm.expiryDate || undefined,
        isGift: inventoryForm.isGift,
        totalValue: parseFloat(inventoryForm.totalValue) || 0,
        wallet_id: inventoryForm.isGift ? undefined : inventoryForm.wallet_id
      };

      if (editingInventoryItem) {
        await updateInventory(editingInventoryItem.id, reqData);
      } else {
        await createInventory(reqData);
      }
      fetchData(true, true);
      setIsModalOpen(false);
      window.dispatchEvent(new Event('sao-inventory-updated'));
      window.dispatchEvent(new Event('sao-finance-updated'));
    } catch (err: any) {
      showAlert(err.response?.data?.error || err.message || 'Lỗi lưu kho');
    }
  };

  const handleDeleteInventory = async () => {
    if (!inventoryToDelete) return;
    try {
      await deleteInventory(inventoryToDelete);
      setInventory(inventory.filter(i => i.id !== inventoryToDelete));
      setInventoryToDelete(null);
      if (isModalOpen && modalType === 'inventory') setIsModalOpen(false);
      fetchData(true, true);
      window.dispatchEvent(new Event('sao-inventory-updated'));
      window.dispatchEvent(new Event('sao-finance-updated'));
    } catch (e: any) {
      showAlert(e.response?.data?.error || e.message || 'Lỗi xóa mặt hàng khỏi kho');
    }
  };

  const handleCleanupExpired = async () => {
    try {
      const res: any = await cleanupExpiredInventory();
      showAlert(res?.message || 'Đã dọn sạch đồ quá hạn khỏi tủ lạnh!');
      fetchData(true, true);
      window.dispatchEvent(new Event('sao-inventory-updated'));
    } catch (e: any) {
      showAlert(e?.response?.data?.error || 'Lỗi khi dọn đồ quá hạn');
    }
  };

  // AI Scan Bill
  const handleScanBill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningBill(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        try {
          const res = await fetch('/api/ai/scan-bill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_data: base64data })
          });
          const data = await res.json();
          if (data && data.items) {
            const items = data.items.map((item: any, index: number) => ({
              ...item,
              id: index,
              isGift: false,
              keep: true,
            }));
            setScannedBillItems(items);
            setBillWalletId('');
            setModalType('scan_bill_review');
            setIsModalOpen(true);
          } else {
            showAlert(data.error || 'Lỗi quét hóa đơn');
          }
        } catch (err) {
          showAlert('Lỗi gọi AI phân tích hóa đơn');
        } finally {
          setIsScanningBill(false);
          e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showAlert('Lỗi đọc ảnh hóa đơn');
      setIsScanningBill(false);
      e.target.value = '';
    }
  };

  const handleSaveScannedBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToSave = scannedBillItems.filter(i => i.keep);
    const needsWallet = itemsToSave.some(i => !i.isGift && (i.price > 0));
    if (needsWallet && !billWalletId) {
      showAlert(t('menu.enterBillWalletPrompt'));
      return;
    }

    try {
      for (const item of itemsToSave) {
        const isNonKitchen = item.category === 'utilities' || item.category === 'housing' || item.category === 'health' || item.category === 'other';
        if (isNonKitchen) {
          // Ghi nhận trực tiếp vào chi tiêu tài chính, không nhập vào kho bếp
          if (!item.isGift && (item.price || 0) > 0) {
            await createTransaction({
              type: 'expense',
              amount: item.price,
              date: new Date().toISOString(),
              description: `Mua đồ dùng: ${item.name}`,
              category: item.category || 'utilities',
              wallet_id: billWalletId
            });
          }
        } else {
          // Thực phẩm hoặc Gia vị -> Nhập vào kho bếp
          await createInventory({
            name: item.name,
            category: item.category === 'spices' ? 'spices' : 'food',
            stock_status: item.category === 'spices' ? 'stable' : undefined,
            quantity: item.category === 'spices' ? 1 : (item.quantity || 1),
            unit: item.unit || (item.category === 'spices' ? 'hộp' : 'cái'),
            purchaseDate: new Date().toISOString(),
            isGift: item.isGift,
            totalValue: item.price || 0,
            wallet_id: (!item.isGift && (item.price || 0) > 0) ? billWalletId : undefined
          });
        }
      }
      setIsModalOpen(false);
      fetchData(true, true);
      window.dispatchEvent(new Event('sao-inventory-updated'));
      window.dispatchEvent(new Event('sao-finance-updated'));
    } catch (err: any) {
      showAlert('Lỗi lưu các món từ hóa đơn vào kho');
    }
  };

  const calculateAI = async (mealId: string, name: string, ingredients: string, imageBase64?: string) => {
    try {
      await calculateMacros({
        mealId,
        food_name: name,
        ingredients_context: ingredients,
        image_data: imageBase64
      });
      fetchData(true, true);
      window.dispatchEvent(new Event('sao-user-updated'));
      window.dispatchEvent(new Event('sao-health-updated'));
    } catch (e) {
      fetchData(true, true);
    }
  };

  const openEditRecipeModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormName(recipe.name);
    setFormIngredients(recipe.ingredients.join(', '));
    setFormInstructions(recipe.instructions || '');
    setModalType('recipe');
    setIsModalOpen(true);
  };

  const confirmDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    try {
      await deleteRecipe(recipeToDelete._id);
      showAlert(t('common.deleteSuccess', 'Đã xóa công thức thành công!'));
      fetchData(true, true);
    } catch (err) {
      showAlert("Lỗi khi xóa công thức");
    } finally {
      setRecipeToDelete(null);
    }
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ingredients = formIngredients.split(',').map(s => s.trim()).filter(Boolean);
      const instructions = formInstructions ? formInstructions.trim() : undefined;
      if (editingRecipe) {
        await updateRecipe(editingRecipe._id, {
          name: formName.trim(),
          ingredients,
          instructions
        });
        showAlert(t('common.updateSuccess', 'Đã cập nhật công thức!'));
      } else {
        await createRecipe({
          name: formName.trim(),
          ingredients,
          instructions
        });
        showAlert(t('common.success', 'Đã tạo công thức mới!'));
      }
      setIsModalOpen(false);
      setEditingRecipe(null);
      fetchData(true, true);
    } catch (e) {
      showAlert("Lỗi lưu công thức");
    }
  };

  const buildAiContextString = (ings: MealIngredientUsed[], manualNote: string, source: 'home' | 'eat_out') => {
    const cleanNote = manualNote.trim();
    if (source !== 'home' || ings.length === 0) {
      return cleanNote;
    }
    const textParts = ings.map(ing => {
      const pool = getIngredientPoolInfo(ing.invId);
      return ing.qty > 0 ? `${ing.qty} ${pool.unit} ${pool.name}` : '';
    }).filter(Boolean);
    const autoContext = textParts.join(', ');
    if (autoContext && cleanNote) {
      return `${autoContext}. Bổ sung: ${cleanNote}`;
    }
    return autoContext || cleanNote;
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedFoodName = formName.trim() || (formImageUrl ? t('menu.mealNameAiRecognizing') : '');
    if (!resolvedFoodName) {
      showAlert(t('menu.enterDishNamePrompt'));
      return;
    }

    const mergedIngredients: MealIngredientUsed[] = [];
    if (formCookSource === 'home' && selectedIngredients.length > 0) {
      const qtyByInvId = new Map<string, number>();
      for (const ing of selectedIngredients) {
        const q = Number(ing.qty);
        if (!ing.invId) continue;
        if (isNaN(q) || q <= 0) {
          const pool = getIngredientPoolInfo(ing.invId);
          showAlert(`Vui lòng nhập số lượng lớn hơn 0 cho nguyên liệu "${pool.name}" (hoặc bấm biểu tượng thùng rác để xóa dòng đó).`);
          return;
        }
        qtyByInvId.set(ing.invId, Number(((qtyByInvId.get(ing.invId) || 0) + q).toFixed(4)));
      }

      for (const [invId, totalQty] of qtyByInvId.entries()) {
        const pool = getIngredientPoolInfo(invId);
        if (totalQty > pool.effectivePoolQty + 1e-6) {
          showAlert(
            `Nguyên liệu "${pool.name}" vượt quá số lượng khả dụng!\n` +
            `• Tối đa có thể dùng: ${pool.effectivePoolQty} ${pool.unit} (Kho hiện còn: ${pool.currentStock} ${pool.unit}${pool.oldHeldQty > 0 ? `, bữa này đang giữ: ${pool.oldHeldQty} ${pool.unit}` : ''})\n` +
            `• Bạn đang nhập: ${totalQty} ${pool.unit}`
          );
          return;
        }
        mergedIngredients.push({
          invId,
          qty: totalQty,
          name: pool.name,
          unit: pool.unit
        });
      }
    }

    const cleanManualNote = formActualIngredients.trim();
    const aiIngredientsContext = buildAiContextString(mergedIngredients, cleanManualNote, formCookSource);

    try {
      let data: any;
      if (editingMeal) {
        data = await updateMeal(editingMeal._id, {
          food_name: resolvedFoodName,
          consumed_at: formDate,
          source: formCookSource,
          ingredients_used: formCookSource === 'home' ? mergedIngredients : [],
          ingredients_text: cleanManualNote || undefined,
          cost: formCookSource === 'eat_out' ? Number(formCost) || 0 : undefined,
          wallet_id: formCookSource === 'eat_out' ? formWalletId : undefined,
          image_url: formImageUrl || undefined
        });
        setMeals(meals.map(m => m._id === editingMeal._id ? data.mealLog : m));
      } else {
        data = await createMeal({
          food_name: resolvedFoodName,
          consumed_at: formDate,
          source: formCookSource,
          recipe_id: editingRecipe ? editingRecipe._id : undefined,
          ingredients_used: formCookSource === 'home' ? mergedIngredients : [],
          ingredients_text: cleanManualNote || undefined,
          cost: formCookSource === 'eat_out' ? Number(formCost) || 0 : undefined,
          wallet_id: formCookSource === 'eat_out' ? formWalletId : undefined,
          image_url: formImageUrl || undefined
        });
        setMeals([data.mealLog, ...meals]);
      }

      setIsModalOpen(false);

      const shouldRunAi = !editingMeal || data.needsAiRecalc !== false;
      if (shouldRunAi) {
        calculateAI(data.mealLog._id, resolvedFoodName, aiIngredientsContext);
      }

      fetchData(true, true);
      window.dispatchEvent(new Event('sao-user-updated'));
      window.dispatchEvent(new Event('sao-finance-updated'));
      window.dispatchEvent(new Event('sao-health-updated'));
    } catch (e: any) {
      showAlert(e.response?.data?.error || e.message || "Lỗi lưu bữa ăn");
    }
  };

  const handleRetryAI = (meal: MealRecord) => {
    setMeals(meals.map(m => m._id === meal._id ? { ...m, ai_status: 'pending' } : m));
    const cleanNote = extractCleanManualNote(meal);
    const contextStr = buildAiContextString(meal.ingredients_used || [], cleanNote, meal.source);
    calculateAI(meal._id, meal.food_name, contextStr);
  };

  const renderModalContent = () => {
    if (modalType === 'recipe') {
      return (
        <RecipeModal
          formName={formName}
          setFormName={setFormName}
          formIngredients={formIngredients}
          setFormIngredients={setFormIngredients}
          formInstructions={formInstructions}
          setFormInstructions={setFormInstructions}
          onSubmit={handleSaveRecipe}
        />
      );
    }

    if (modalType === 'cook' || modalType === 'meal') {
      return (
        <MealModal
          modalType={modalType}
          editingMeal={editingMeal}
          editingRecipe={editingRecipe}
          formName={formName}
          setFormName={setFormName}
          formImageUrl={formImageUrl}
          setFormImageUrl={setFormImageUrl}
          formCookSource={formCookSource}
          setFormCookSource={setFormCookSource}
          formDate={formDate}
          setFormDate={setFormDate}
          formActualIngredients={formActualIngredients}
          setFormActualIngredients={setFormActualIngredients}
          formCost={formCost}
          setFormCost={setFormCost}
          formWalletId={formWalletId}
          setFormWalletId={setFormWalletId}
          selectedIngredients={selectedIngredients}
          setSelectedIngredients={setSelectedIngredients}
          inventory={inventory}
          wallets={wallets}
          getIngredientPoolInfo={getIngredientPoolInfo}
          estimateIngredientCost={estimateIngredientCost}
          estimatedHomeTotalCost={estimatedHomeTotalCost}
          onSubmit={handleSaveMeal}
          showAlert={showAlert}
        />
      );
    }

    if (modalType === 'inventory') {
      return (
        <InventoryModal
          inventoryForm={inventoryForm}
          setInventoryForm={setInventoryForm}
          editingInventoryItem={editingInventoryItem}
          wallets={wallets}
          onSubmit={handleSaveInventory}
          onDelete={editingInventoryItem ? () => setInventoryToDelete(editingInventoryItem.id) : undefined}
          formatMoney={formatMoney}
        />
      );
    }

    if (modalType === 'scan_bill_review') {
      return (
        <BillScanReviewModal
          scannedBillItems={scannedBillItems}
          setScannedBillItems={setScannedBillItems}
          billWalletId={billWalletId}
          setBillWalletId={setBillWalletId}
          wallets={wallets}
          onSubmit={handleSaveScannedBill}
          formatMoney={formatMoney}
        />
      );
    }

    return null;
  };

  return (
    <div className={styles.menuContainer}>
      <SaoTabs
        tabs={getMenuTabs(t).map(t => ({ id: t.id, label: t.label, icon: <t.icon size={18} /> }))}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as MenuTabId)}
      />

      <div className={styles.scrollArea}>
        {loading ? (
          <SaoLoading fullPage />
        ) : activeTab === 'history' ? (
          /* TAB 1: LỊCH SỬ BỮA ĂN (MẶC ĐỊNH 7 NGÀY GẦN NHẤT & TÌM KIẾM BE) */
          <MealHistoryTab
            meals={meals}
            inventory={inventory}
            formatMoney={formatMoney}
            onEditMeal={openEditMealModal}
            onDeleteMeal={confirmDeleteMeal}
            onRetryAI={handleRetryAI}
            onAddMeal={openGlobalAddModal}
            extractCleanManualNote={extractCleanManualNote}
            toVnDateString={toVnDateString}
            days={mealsDays}
            search={mealsSearch}
            onDaysChange={(d) => {
              setMealsDays(d);
              fetchMeals(d, mealsSearch);
            }}
            onSearchChange={(s) => {
              setMealsSearch(s);
              fetchMeals(mealsDays, s);
            }}
            isLoading={isMealsLoading}
          />
        ) : activeTab === 'inventory' ? (
          /* TAB 2: DỰ TRỮ & KHO ĐỒ */
          <InventoryTab
            inventory={inventory}
            formatMoney={formatMoney}
            isFabExpanded={isInventoryFabExpanded}
            onToggleFab={() => setIsInventoryFabExpanded(!isInventoryFabExpanded)}
            onManualAdd={openAddInventoryModal}
            onEdit={openEditInventoryModal}
            onUpdateQty={handleUpdateInventoryQty}
            onUpdateStockStatus={handleUpdateStockStatus}
            onCleanupExpired={handleCleanupExpired}
            onScanBill={handleScanBill}
          />
        ) : (
          /* TAB 3: CÔNG THỨC NẤU ĂN */
          <RecipesTab
            recipes={recipes}
            onCookRecipe={openCookModal}
            onEditRecipe={openEditRecipeModal}
            onDeleteRecipe={(r) => setRecipeToDelete(r)}
            onAddRecipe={openGlobalAddModal}
          />
        )}
      </div>

      {/* FAB chung cho tab Lịch sử và Công thức (Tab Dự trữ có FAB đa năng riêng) */}
      {activeTab !== 'inventory' && (
        <SaoFab
          title={activeTab === 'recipes' ? t('menu.addRecipe') : t('menu.addMeal')}
          onClick={openGlobalAddModal}
          position="fixed"
        />
      )}

      {/* MODAL CHÍNH */}
      <SaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size={modalType === 'cook' || modalType === 'meal' ? 'lg' : 'md'}
        title={
          modalType === 'cook' ? t('menu.cookDetails') :
            modalType === 'recipe' ? (editingRecipe ? t('menu.editRecipe') : t('menu.addRecipe')) :
              modalType === 'inventory' ? (editingInventoryItem ? t('menu.editInventory') : t('menu.addInventory')) :
                modalType === 'scan_bill_review' ? t('menu.scanBillReview') :
                  (editingMeal ? t('menu.editMeal') : t('menu.addMeal'))
        }
      >
        {renderModalContent()}
      </SaoModal>

      {/* MODAL XÁC NHẬN XÓA BỮA ĂN */}
      <SaoConfirmModal
        isOpen={!!mealToDelete}
        onClose={() => setMealToDelete(null)}
        onConfirm={handleDeleteMeal}
        title={t('menu.confirmDeleteMeal')}
        message={t('menu.deleteMealDesc')}
      />

      {/* MODAL XÁC NHẬN XÓA MẶT HÀNG KHO */}
      <SaoConfirmModal
        isOpen={!!inventoryToDelete}
        onClose={() => setInventoryToDelete(null)}
        onConfirm={handleDeleteInventory}
        title={t('menu.confirmDeleteInventory')}
        message={t('menu.deleteInventoryDesc')}
      />

      {/* MODAL XÁC NHẬN XÓA CÔNG THỨC */}
      <SaoConfirmModal
        isOpen={!!recipeToDelete}
        onClose={() => setRecipeToDelete(null)}
        onConfirm={confirmDeleteRecipe}
        title={t('common.confirmDelete', 'Xác nhận xóa')}
        message={`Bạn có chắc chắn muốn xóa công thức "${recipeToDelete?.name}" không?`}
      />
    </div>
  );
}
