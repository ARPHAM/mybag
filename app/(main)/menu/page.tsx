"use client";

import { useState, useEffect } from 'react';
import {
  ChefHat, Flame, Clock, Plus, Edit3, Utensils, History, Sparkles, Save,
  CheckCircle2, ShoppingBag, AlertCircle, RefreshCw, Trash2, Beef, Droplet,
  Wheat, Candy, AlertTriangle, Package, Camera, ImageIcon, Wallet as WalletIcon,
  ShieldAlert, FileText
} from 'lucide-react';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoInput from '../../components/SaoInput/SaoInput';
import SaoButton from '../../components/SaoButton/SaoButton';
import { useSaoAlert } from '../../contexts/AlertContext';
import SaoLoading from '../../components/SaoLoading/SaoLoading';
import SaoSelect from '../../components/SaoSelect/SaoSelect';
import SaoTabs from '../../components/SaoTabs/SaoTabs';
import SaoDatePicker from '../../components/SaoDatePicker/SaoDatePicker';
import SaoImageUpload from '../../components/SaoImageUpload/SaoImageUpload';
import {
  getRecipes, getMeals, getInventory, calculateMacros, createRecipe,
  createMeal, getWallets, updateMeal, deleteMeal,
  createInventory, updateInventory, deleteInventory
} from './api';
import InventoryTab from './components/InventoryTab';
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
import { convertQtyToInventoryUnit, parseRecipeIngredientString } from '@/lib/unitHelper';

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

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
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

  const fetchData = async (force = false, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [resR, resM, resI, resW]: any = await Promise.all([
        getRecipes(force),
        getMeals(force),
        getInventory(force),
        getWallets(force)
      ]);
      if (resR) setRecipes(resR);
      if (resM) setMeals(resM);
      if (resI) setInventory(resI.map((i: any) => ({ ...i, id: i._id })));
      if (resW) setWallets(resW);
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

  const groupedMeals = meals.reduce((acc, meal) => {
    const date = toVnDateString(meal.consumed_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(meal);
    return acc;
  }, {} as Record<string, MealRecord[]>);

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

    const availableInventory = inventory.filter(i => i.quantity > 0);
    const matched: MealIngredientUsed[] = [];
    const usedIds = new Set<string>();
    recipe.ingredients.forEach(ingName => {
      const parsed = parseRecipeIngredientString(ingName);
      const searchName = (parsed.cleanName || ingName).toLowerCase();
      const match = availableInventory.find(
        i => !usedIds.has(i.id) && (
          i.name.toLowerCase().includes(searchName) ||
          searchName.includes(i.name.toLowerCase()) ||
          i.name.toLowerCase().includes(ingName.toLowerCase()) ||
          ingName.toLowerCase().includes(i.name.toLowerCase())
        )
      );
      if (match) {
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
    setFormImageUrl('');
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
        await createInventory({
          name: item.name,
          category: item.category || 'food',
          stock_status: item.category === 'spices' ? 'stable' : undefined,
          quantity: item.quantity || 1,
          unit: item.unit || 'cái',
          purchaseDate: new Date().toISOString(),
          isGift: item.isGift,
          totalValue: item.price || 0,
          wallet_id: (!item.isGift && item.price > 0) ? billWalletId : undefined
        });
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

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRecipe({
        name: formName,
        ingredients: formIngredients.split(',').map(s => s.trim()).filter(Boolean),
        instructions: formInstructions ? formInstructions.trim() : undefined
      });
      setIsModalOpen(false);
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
        <form onSubmit={handleSaveRecipe}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.recipeName')}</label>
            <SaoInput type="text" placeholder={t('menu.recipeNamePlaceholder')} value={formName} onChange={e => setFormName(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.recipeIngredients')}</label>
            <SaoInput isTextarea placeholder={t('menu.recipeIngredientsPlaceholder')} rows={3} value={formIngredients} onChange={e => setFormIngredients(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.recipeInstructions')}</label>
            <SaoInput isTextarea placeholder={t('menu.recipeInstructionsPlaceholder')} rows={3} value={formInstructions} onChange={e => setFormInstructions(e.target.value)} />
          </div>
          <SaoButton variant="primary" type="submit">
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {t('menu.saveRecipe')}
          </SaoButton>
        </form>
      );
    }

    if (modalType === 'cook' || modalType === 'meal') {
      return (
        <form onSubmit={handleSaveMeal}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.mealPhoto')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {formImageUrl && (
                <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '6px', border: '1px solid #00f0ff', backgroundImage: `url(${formImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                  <button
                    type="button"
                    onClick={() => setFormImageUrl('')}
                    title={t('common.delete')}
                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ff4444', color: '#fff', border: 'none', fontSize: '11px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              )}
              <SaoImageUpload onUploadSuccess={(url: string) => setFormImageUrl(url)} label={formImageUrl ? undefined : undefined} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('menu.mealName')} {formImageUrl && <span style={{ color: '#00ffaa', fontSize: '0.8rem', fontWeight: 'normal' }}>{t('menu.mealNameAutoAi')}</span>}
            </label>
            <SaoInput
              type="text"
              placeholder={formImageUrl ? t('menu.mealNamePlaceholderAi') : t('menu.mealNamePlaceholder')}
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required={modalType === 'meal' && !formImageUrl}
              readOnly={modalType === 'cook'}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.diningOption')}</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input type="radio" name="source" checked={formCookSource === 'home'} onChange={() => setFormCookSource('home')} />
                <Utensils size={16} style={{ marginBottom: 4 }} />
                <div>{t('menu.homeCook')}</div>
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" name="source" checked={formCookSource === 'eat_out'} onChange={() => setFormCookSource('eat_out')} />
                <ShoppingBag size={16} style={{ marginBottom: 4 }} />
                <div>{t('menu.eatOut')}</div>
              </label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('menu.date')}</label>
              <SaoDatePicker value={formDate} onChange={setFormDate} required />
            </div>
          </div>

          {editingRecipe && (
            <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
              <label className={styles.formLabel} style={{ color: '#a0c4ff', marginBottom: 0 }}>{t('menu.suggestedRecipe')}:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                {editingRecipe.ingredients.map((ing, i) => (
                  <span key={i} style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>{ing}</span>
                ))}
              </div>
              {editingRecipe.instructions && (
                <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #00f0ff', whiteSpace: 'pre-line', lineHeight: '1.45' }}>
                  <strong style={{ color: '#00f0ff', display: 'block', marginBottom: '4px' }}>{t('menu.cookingGuide')}:</strong>
                  {editingRecipe.instructions}
                </div>
              )}
            </div>
          )}

          {formCookSource === 'home' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('menu.pantryDeductSection')}</label>
              <div className={styles.ingredientCheckList}>
                {selectedIngredients.map((ing, idx) => {
                  const pool = getIngredientPoolInfo(ing.invId);
                  const rowEstimatedCost = estimateIngredientCost(ing.invId, ing.qty);
                  const isOverLimit = Number(ing.qty) > pool.effectivePoolQty + 1e-6;

                  const optionIds = new Set<string>();
                  const selectOptions: { value: string; label: string }[] = [];

                  inventory.forEach(item => {
                    const p = getIngredientPoolInfo(item.id);
                    if (p.effectivePoolQty > 0 || item.id === ing.invId) {
                      optionIds.add(item.id);
                      let label = `${item.name} (${t('menu.remaining')}: ${p.currentStock} ${item.unit})`;
                      if (p.oldHeldQty > 0) {
                        if (p.currentStock <= 0) {
                          label = `${item.name} (${t('menu.depletedPantry')} • ${t('menu.inUse')}: ${p.oldHeldQty} ${item.unit} → ${t('menu.max')}: ${p.effectivePoolQty} ${item.unit})`;
                        } else {
                          label = `${item.name} (${t('menu.stock')}: ${p.currentStock} + ${t('menu.inUse')}: ${p.oldHeldQty} → ${t('menu.max')}: ${p.effectivePoolQty} ${item.unit})`;
                        }
                      }
                      selectOptions.push({ value: item.id, label });
                    }
                  });

                  if (ing.invId && !optionIds.has(ing.invId)) {
                    selectOptions.unshift({
                      value: ing.invId,
                      label: `${pool.name} (${t('menu.deletedFromPantry')} • ${t('menu.holding')}: ${pool.effectivePoolQty} ${pool.unit})`
                    });
                  }

                  return (
                    <div key={`${ing.invId}-${idx}`} style={{ marginBottom: '10px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: isOverLimit ? '1px solid #ff4444' : '1px solid rgba(0, 240, 255, 0.15)' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 2 }}>
                          <SaoSelect
                            initialValue={ing.invId}
                            options={selectOptions}
                            onChange={(val) => {
                              const targetPool = getIngredientPoolInfo(val);
                              const newArr = selectedIngredients.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      invId: val,
                                      name: targetPool.name,
                                      unit: targetPool.unit,
                                      qty: Math.min(Number(item.qty) || 1, Math.max(1, targetPool.effectivePoolQty))
                                    }
                                  : item
                              );
                              setSelectedIngredients(newArr);
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <SaoInput
                            type="number"
                            step="any"
                            min="0.01"
                            max={pool.effectivePoolQty > 0 ? pool.effectivePoolQty : undefined}
                            value={ing.qty}
                            onChange={(e) => {
                              const valNum = Number(e.target.value);
                              const newArr = selectedIngredients.map((item, i) =>
                                i === idx ? { ...item, qty: valNum } : item
                              );
                              setSelectedIngredients(newArr);
                            }}
                            style={{ padding: '8px' }}
                          />
                          <span style={{ color: '#a0c4ff', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{pool.unit}</span>
                        </div>
                        <SaoButton
                          type="button"
                          onClick={() => setSelectedIngredients(selectedIngredients.filter((_, i) => i !== idx))}
                          style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={18} />
                        </SaoButton>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '4px', padding: '0 2px', color: isOverLimit ? '#ff4444' : '#94a3b8' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isOverLimit ? (
                            <>
                              <AlertTriangle size={13} /> {t('menu.exceedsMax')} ({t('menu.max')}: {pool.effectivePoolQty} {pool.unit})
                            </>
                          ) : (
                            `${t('menu.maxAvailable')}: ${pool.effectivePoolQty} ${pool.unit}${pool.oldHeldQty > 0 && pool.currentStock === 0 ? ` (${t('menu.depletedInStock')})` : ''}`
                          )}
                        </span>
                        {rowEstimatedCost > 0 && (
                          <span style={{ color: '#00f0ff', fontWeight: 500 }}>
                            {t('menu.pantryCost')}: ≈ {rowEstimatedCost.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.vnd')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <SaoButton
                  variant="primary"
                  type="button"
                  style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', border: '1px dashed #00f0ff', marginTop: '5px' }}
                  onClick={() => {
                    const allCandidates = inventory.filter(i => getIngredientPoolInfo(i.id).effectivePoolQty > 0);
                    if (allCandidates.length === 0) {
                      showAlert(t('menu.noStockAvailable'));
                      return;
                    }
                    const selectedIds = new Set(selectedIngredients.map(s => s.invId));
                    const unselectedCandidate = allCandidates.find(i => !selectedIds.has(i.id));
                    const chosen = unselectedCandidate || allCandidates.find(i => {
                      const usedQty = selectedIngredients
                        .filter(s => s.invId === i.id)
                        .reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
                      return getIngredientPoolInfo(i.id).effectivePoolQty - usedQty > 1e-6;
                    });

                    if (!chosen) {
                      showAlert(t('menu.allStockSelected'));
                      return;
                    }
                    const pool = getIngredientPoolInfo(chosen.id);
                    const alreadyUsed = selectedIngredients
                      .filter(s => s.invId === chosen.id)
                      .reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
                    const remaining = Math.max(0.1, Number((pool.effectivePoolQty - alreadyUsed).toFixed(4)));
                    setSelectedIngredients([
                      ...selectedIngredients,
                      {
                        invId: chosen.id,
                        qty: Math.min(1, remaining),
                        name: chosen.name,
                        unit: chosen.unit
                      }
                    ]);
                  }}
                >
                  <Plus size={16} style={{ display: 'inline', marginRight: 5 }} /> {t('menu.addIngredientFromPantry')}
                </SaoButton>

                {(selectedIngredients.length > 0 || (editingMeal && editingMeal.source === 'home' && (editingMeal.cost || 0) > 0)) && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 600 }}>
                      <span>{t('menu.pantryCost')}:</span>
                      <span style={{ color: '#00f0ff', fontSize: '1rem' }}>{estimatedHomeTotalCost.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.currency')}</span>
                    </div>
                    {editingMeal && editingMeal.source === 'home' && (editingMeal.cost || 0) !== estimatedHomeTotalCost && (
                      <div style={{ fontSize: '0.78rem', color: '#ffaa00', marginTop: '4px' }}>
                        {t('menu.diffFromOriginal')}: {(editingMeal.cost || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.currency')} → {estimatedHomeTotalCost.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.currency')}
                        {estimatedHomeTotalCost < (editingMeal.cost || 0)
                          ? ` (${t('menu.refundToPantry')} ${( (editingMeal.cost || 0) - estimatedHomeTotalCost ).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} ${t('common.currency')})`
                          : ` (${t('menu.deductFromPantry')} ${( estimatedHomeTotalCost - (editingMeal.cost || 0) ).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} ${t('common.currency')})`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.additionalNote')}</label>
            <SaoInput isTextarea placeholder={t('menu.additionalNotePlaceholder')} rows={2} value={formActualIngredients} onChange={e => setFormActualIngredients(e.target.value)} />
          </div>

          {formCookSource === 'eat_out' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('menu.amountVnd')}</label>
                <SaoInput type="number" placeholder="0" value={formCost} onChange={e => setFormCost(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('menu.paymentWallet')}</label>
                <SaoSelect
                  initialValue={formWalletId}
                  options={wallets.map(w => ({ value: w._id, label: `${w.name} (${w.balance.toLocaleString('vi-VN')} đ)` }))}
                  onChange={setFormWalletId}
                />
              </div>
            </>
          )}

          <SaoButton variant="primary" type="submit">
            <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 8 }} /> {modalType === 'cook' ? t('menu.recordCook') : (editingMeal ? t('menu.editMeal') : t('menu.saveMeal'))}
          </SaoButton>
        </form>
      );
    }

    if (modalType === 'inventory') {
      const isSpice = inventoryForm.category === 'spices';
      return (
        <form onSubmit={handleSaveInventory}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.itemName')}</label>
            <SaoInput
              type="text"
              placeholder={isSpice ? t('menu.spiceItemPlaceholder') : t('menu.foodItemPlaceholder')}
              value={inventoryForm.name}
              onChange={e => setInventoryForm({ ...inventoryForm, name: e.target.value })}
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('menu.category')}</label>
              <SaoSelect
                initialValue={inventoryForm.category}
                options={getInventoryCategoryOptions(t)}
                onChange={v => setInventoryForm({
                  ...inventoryForm,
                  category: v,
                  stock_status: v === 'spices' ? (inventoryForm.stock_status || 'stable') : inventoryForm.stock_status
                })}
              />
            </div>
            {isSpice ? (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('menu.spiceUsageLevel')}</label>
                <SaoSelect
                  initialValue={inventoryForm.stock_status}
                  options={[
                    { value: 'stable', label: t('menu.spiceStable') },
                    { value: 'low', label: t('menu.spiceLow') },
                    { value: 'out', label: t('menu.spiceOut') }
                  ]}
                  onChange={v => setInventoryForm({
                    ...inventoryForm,
                    stock_status: v as 'stable' | 'low' | 'out',
                    quantity: v === 'out' ? '0' : (parseFloat(inventoryForm.quantity) > 0 ? inventoryForm.quantity : '1')
                  })}
                />
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('menu.quantityAndUnit')}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <SaoInput
                    type="number"
                    step="any"
                    min="0"
                    placeholder="VD: 1.5"
                    value={inventoryForm.quantity}
                    onChange={e => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                    required
                  />
                  <SaoSelect
                    initialValue={inventoryForm.unit}
                    placeholder={t('menu.unit')}
                    allowCustom={true}
                    options={INVENTORY_UNIT_OPTIONS}
                    onChange={v => setInventoryForm({ ...inventoryForm, unit: v })}
                  />
                </div>
              </div>
            )}
          </div>

          {isSpice && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('menu.estimatedQtyOptional')}</label>
                <SaoInput
                  type="number"
                  step="any"
                  min="0"
                  placeholder="VD: 1"
                  value={inventoryForm.quantity}
                  onChange={e => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('menu.unit')}</label>
                <SaoSelect
                  initialValue={inventoryForm.unit}
                  placeholder={t('menu.unit')}
                  allowCustom={true}
                  options={INVENTORY_UNIT_OPTIONS}
                  onChange={v => setInventoryForm({ ...inventoryForm, unit: v })}
                />
              </div>
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('menu.purchaseDateStock')}</label>
              <SaoDatePicker
                value={inventoryForm.purchaseDate}
                onChange={v => setInventoryForm({ ...inventoryForm, purchaseDate: v })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('menu.expiryDateOptional')}</label>
              <SaoDatePicker
                value={inventoryForm.expiryDate}
                onChange={v => setInventoryForm({ ...inventoryForm, expiryDate: v })}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: 8, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#a0c4ff' }}>
              <input
                type="checkbox"
                checked={inventoryForm.isGift}
                onChange={e => setInventoryForm({
                  ...inventoryForm,
                  isGift: e.target.checked,
                  wallet_id: e.target.checked ? '' : inventoryForm.wallet_id
                })}
                style={{ width: 18, height: 18 }}
              />
              {t('menu.isGiftFree')}
            </label>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('menu.totalCostEst')}</label>
              <SaoInput
                type="number"
                placeholder="VD: 50000"
                value={inventoryForm.totalValue}
                onChange={e => setInventoryForm({ ...inventoryForm, totalValue: e.target.value })}
              />
            </div>
            {!inventoryForm.isGift && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('menu.paymentSource')}</label>
                <SaoSelect
                  initialValue={inventoryForm.wallet_id}
                  placeholder={t('menu.selectWallet')}
                  options={wallets.map(w => ({ value: w._id, label: `${w.name} (${formatMoney(w.balance)} đ)` }))}
                  onChange={v => setInventoryForm({ ...inventoryForm, wallet_id: v })}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: editingInventoryItem ? 'space-between' : 'flex-end', gap: '10px', marginTop: 15 }}>
            {editingInventoryItem && (
              <SaoButton
                variant="danger"
                type="button"
                onClick={() => setInventoryToDelete(editingInventoryItem.id)}
              >
                <Trash2 size={16} /> {t('common.delete')}
              </SaoButton>
            )}
            <SaoButton variant="primary" type="submit">
              <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 6 }} />
              {editingInventoryItem ? t('common.save') : t('common.add')}
            </SaoButton>
          </div>
        </form>
      );
    }

    if (modalType === 'scan_bill_review') {
      return (
        <form onSubmit={handleSaveScannedBill}>
          <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 15 }}>
            {t('menu.aiRecognizedBill')}
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scannedBillItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
                <input
                  type="checkbox"
                  checked={item.keep}
                  onChange={e => {
                    const newArr = [...scannedBillItems];
                    newArr[idx].keep = e.target.checked;
                    setScannedBillItems(newArr);
                  }}
                  style={{ width: 18, height: 18 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</div>
                  <div style={{ color: '#a0c4ff', fontSize: '0.8rem' }}>
                    {item.quantity} {item.unit || (language === 'en' ? 'pcs' : 'cái')} • {formatMoney(item.price || 0)} {t('common.vnd')} • {item.category === 'spices' ? t('menu.spices') : t('menu.mainFood')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('menu.paymentWallet')}</label>
            <SaoSelect
              initialValue={billWalletId}
              placeholder={t('menu.selectWallet')}
              options={wallets.map(w => ({ value: w._id, label: `${w.name} (${formatMoney(w.balance)} đ)` }))}
              onChange={setBillWalletId}
            />
          </div>

          <SaoButton variant="primary" type="submit" style={{ width: '100%', marginTop: 10 }}>
            <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 6 }} /> {t('menu.saveScannedBill')}
          </SaoButton>
        </form>
      );
    }
  };

  return (
    <div className={styles.menuContainer}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <ChefHat className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>{t('menu.title')}</h1>
        </div>
      </div>

      <SaoTabs
        tabs={getMenuTabs(t).map(t => ({ id: t.id, label: t.label, icon: <t.icon size={18} /> }))}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as MenuTabId)}
      />

      <div className={styles.scrollArea}>
        {loading ? (
          <SaoLoading fullPage />
        ) : activeTab === 'history' ? (
          /* TAB 1: LỊCH SỬ BỮA ĂN (MẶC ĐỊNH) */
          <div style={{ animation: 'fadeIn 0.4s ease-out' }} className={styles.historyTimeline}>
            {Object.keys(groupedMeals).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '50px 20px' }}>
                <History size={48} style={{ opacity: 0.3, marginBottom: 12, display: 'inline-block' }} />
                <div>{t('menu.emptyMeals')}</div>
                <SaoButton
                  variant="primary"
                  onClick={openGlobalAddModal}
                  style={{ marginTop: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={16} /> {t('menu.firstMealPrompt')}
                </SaoButton>
              </div>
            ) : (
              Object.entries(groupedMeals)
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date, dayMeals]) => (
                  <div key={date} className={styles.timelineDay}>
                    <div className={styles.timelineDate}>{date}</div>
                    <div className={styles.mealCards}>
                      {dayMeals.map(meal => {
                        const cleanNote = extractCleanManualNote(meal);
                        return (
                          <div key={meal._id} className={styles.mealCard}>
                            <div className={styles.mealIcon}>
                              {meal.source === 'eat_out' ? <ShoppingBag size={20} /> : <ChefHat size={20} />}
                            </div>
                            <div className={styles.mealInfo}>
                              <div className="flex justify-between items-start">
                                <div className={styles.mealName}>{meal.food_name}</div>
                                <div className="flex gap-2">
                                  <button onClick={() => openEditMealModal(meal)} title={t('common.edit')} style={{ background: 'none', border: 'none', color: '#00f0ff', cursor: 'pointer', padding: '4px' }}>
                                    <Edit3 size={16} />
                                  </button>
                                  <button onClick={() => confirmDeleteMeal(meal._id)} title={t('common.delete')} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '4px' }}>
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className={styles.mealTimeType}>
                                <span>{meal.source === 'eat_out' ? t('menu.eatOut') : t('menu.homeCook')}</span>
                                {meal.cost !== undefined && meal.cost > 0 && (
                                  <span style={{ color: '#00f0ff' }} suppressHydrationWarning>
                                    {' '}• {meal.source === 'home' ? t('menu.pantryCost') : t('menu.cost')}: {meal.cost.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {t('common.currency')}
                                  </span>
                                )}
                              </div>

                              {meal.source === 'home' && meal.ingredients_used && meal.ingredients_used.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                  {meal.ingredients_used.map((ing, i) => {
                                    const invItem = inventory.find(item => item.id === ing.invId);
                                    const name = ing.name || invItem?.name || t('menu.pantryIngredient');
                                    const unit = ing.unit || invItem?.unit || '';
                                    const isDepletedNow = invItem ? invItem.quantity <= 0 : false;
                                    return (
                                      <span
                                        key={`${ing.invId}-${i}`}
                                        style={{
                                          fontSize: '0.75rem',
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          background: isDepletedNow ? 'rgba(255, 170, 0, 0.12)' : 'rgba(0, 240, 255, 0.1)',
                                          border: isDepletedNow ? '1px solid rgba(255, 170, 0, 0.35)' : '1px solid rgba(0, 240, 255, 0.25)',
                                          color: isDepletedNow ? '#ffcc66' : '#a0c4ff'
                                        }}
                                        title={isDepletedNow ? t('menu.itemDepleted') : undefined}
                                      >
                                        {ing.qty} {unit} {name}
                                        {ing.cost && ing.cost > 0 ? ` (-${ing.cost.toLocaleString('vi-VN')}đ)` : ''}
                                        {isDepletedNow ? ` • ${t('menu.depletedPantry')}` : ''}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {cleanNote && (
                                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <FileText size={12} /> {t('common.notes')}: {cleanNote}
                                </div>
                              )}

                              {meal.ai_status === 'completed' && (
                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#a0c4ff', marginTop: '6px', flexWrap: 'wrap' }}>
                                  <span title="Calories" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Flame size={12} /> {meal.calo} Kcal</span>
                                  <span title="Protein" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Beef size={12} /> {meal.protein}g</span>
                                  <span title="Fat" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Droplet size={12} /> {meal.fat}g</span>
                                  <span title="Carbs" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Wheat size={12} /> {meal.carbs}g</span>
                                  <span title="Sugar" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Candy size={12} /> {meal.sugar}g</span>
                                </div>
                              )}
                              {meal.ai_status === 'completed' && meal.ai_description && (
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px', fontStyle: 'italic' }}>
                                  <Sparkles size={12} style={{ display: 'inline', marginRight: '4px', color: '#00f0ff' }} />
                                  {meal.ai_description}
                                </div>
                              )}
                              {meal.ai_status === 'pending' && (
                                <div style={{ fontSize: '0.8rem', color: '#ffaa00', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Sparkles size={12} /> {t('menu.aiCalculating')}
                                </div>
                              )}
                              {meal.ai_status === 'failed' && (
                                <div style={{ fontSize: '0.8rem', color: '#ff4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <AlertCircle size={12} /> {t('menu.aiError')}
                                  <SaoButton
                                    type="button"
                                    onClick={() => handleRetryAI(meal)}
                                    style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', padding: '2px 6px', marginLeft: '6px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    <RefreshCw size={10} /> {t('menu.retry')}
                                  </SaoButton>
                                </div>
                              )}

                              {meal.edit_note && (
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#00ffaa',
                                    background: 'rgba(0, 255, 170, 0.07)',
                                    borderLeft: '2px solid #00ffaa',
                                    padding: '4px 8px',
                                    borderRadius: '0 4px 4px 0',
                                    marginTop: '6px'
                                  }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Edit3 size={11} /> {meal.edit_note}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>
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
            onScanBill={handleScanBill}
          />
        ) : (
          /* TAB 3: CÔNG THỨC NẤU ĂN */
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className={styles.recipesGrid}>
              {recipes.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', gridColumn: '1 / -1', padding: '40px' }}>
                  {t('menu.emptyRecipes')}
                </div>
              )}
              {recipes.map(recipe => (
                <div key={recipe._id} className={styles.recipeCard}>
                  <div className={styles.recipeImage}>
                    <Utensils size={64} color="#00f0ff" strokeWidth={1} />
                  </div>
                  <div className={styles.recipeContent}>
                    <div className={styles.recipeName}>{recipe.name}</div>
                    <div className={styles.recipeIngredients}>
                      {recipe.ingredients.map((ing, i) => (
                        <span key={i} className={styles.ingredientTag}>{ing}</span>
                      ))}
                    </div>
                    {recipe.instructions && (
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: '6px', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={recipe.instructions}>
                        {recipe.instructions}
                      </div>
                    )}
                    <SaoButton className={styles.cookBtn} onClick={() => openCookModal(recipe)}>
                      {t('menu.cookThis')}
                    </SaoButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB chung cho tab Lịch sử và Công thức (Tab Dự trữ có FAB đa năng riêng) */}
      {activeTab !== 'inventory' && (
        <SaoButton
          variant="primary"
          className={styles.menuFab}
          onClick={openGlobalAddModal}
          title={activeTab === 'recipes' ? t('menu.addRecipe') : t('menu.addMeal')}
        >
          <Plus size={28} />
        </SaoButton>
      )}

      {/* MODAL CHÍNH */}
      <SaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
      <SaoModal
        isOpen={!!mealToDelete}
        onClose={() => setMealToDelete(null)}
        title={t('menu.confirmDeleteMeal')}
        icon={<AlertTriangle size={20} />}
      >
        <div style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '20px', lineHeight: '1.5' }}>
          {t('menu.deleteMealDesc')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <SaoButton variant="default" onClick={() => setMealToDelete(null)} type="button">
            {t('common.cancel')}
          </SaoButton>
          <SaoButton variant="danger" onClick={handleDeleteMeal} type="button">
            <Trash2 size={16} /> {t('common.delete')}
          </SaoButton>
        </div>
      </SaoModal>

      {/* MODAL XÁC NHẬN XÓA MẶT HÀNG KHO */}
      <SaoModal
        isOpen={!!inventoryToDelete}
        onClose={() => setInventoryToDelete(null)}
        title={t('menu.confirmDeleteInventory')}
        icon={<AlertTriangle size={20} />}
      >
        <div style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '20px', lineHeight: '1.5' }}>
          {t('menu.deleteInventoryDesc')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <SaoButton variant="default" onClick={() => setInventoryToDelete(null)} type="button">
            {t('common.cancel')}
          </SaoButton>
          <SaoButton variant="danger" onClick={handleDeleteInventory} type="button">
            <Trash2 size={16} /> {t('common.delete')}
          </SaoButton>
        </div>
      </SaoModal>
    </div>
  );
}
