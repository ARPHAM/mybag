"use client";

import { useState, useEffect } from 'react';
import { ChefHat, Flame, Clock, Plus, Edit3, Utensils, History, Sparkles, Save, CheckCircle2, ShoppingBag, AlertCircle, RefreshCw, Trash2, Beef, Droplet, Wheat, Candy, AlertTriangle } from 'lucide-react';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoInput from '../../components/SaoInput/SaoInput';
import SaoButton from '../../components/SaoButton/SaoButton';
import { useSaoAlert } from '../../contexts/AlertContext';
import SaoLoading from '../../components/SaoLoading/SaoLoading';
import SaoSelect from '../../components/SaoSelect/SaoSelect';
import SaoTabs from '../../components/SaoTabs/SaoTabs';
import SaoDatePicker from '../../components/SaoDatePicker/SaoDatePicker';
import SaoImageUpload from '../../components/SaoImageUpload/SaoImageUpload';
import { getRecipes, getMeals, getInventory, calculateMacros, createRecipe, createMeal, getWallets, updateMeal, deleteMeal } from './api';
import styles from './menu.module.css';

import { MenuTabId, Recipe, MealRecord, MealIngredientUsed, InventoryItem } from '@/lib/types';

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
  const { showAlert } = useSaoAlert();
  const [activeTab, setActiveTab] = useState<MenuTabId>('recipes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'cook' | 'recipe' | 'meal'>('cook');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
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

  /**
   * Bóc tách ghi chú thủ công của người dùng, loại bỏ phần autoContext ("2quả Trứng. Bổ sung: ...")
   * bị lưu lẫn vào ingredients_text ở các bản ghi cũ.
   */
  const extractCleanManualNote = (meal: MealRecord): string => {
    const raw = meal.ingredients_text?.trim();
    if (!raw) return '';
    if (raw.includes('. Bổ sung: ')) {
      const parts = raw.split('. Bổ sung: ');
      return parts[parts.length - 1].trim();
    }
    if (meal.source === 'home' && meal.ingredients_used && meal.ingredients_used.length > 0) {
      // Kiểm tra xem raw có phải chỉ là chuỗi liệt kê nguyên liệu tự động từ kho hay không
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
   * Khi đang sửa một bữa ăn (editingMeal), những nguyên liệu đã dùng trong bữa ăn đó (kể cả món hiện đã về 0 trong kho)
   * sẽ được cộng hoàn trả tạm thời vào quỹ khả dụng của bữa ăn này để người dùng xem, giữ nguyên hoặc chỉnh sửa.
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

  /**
   * Ước tính chi phí khấu trừ kho cho một dòng nguyên liệu dựa trên quỹ khả dụng
   */
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

  // Tổng thiệt hại kho dự kiến trên form hiện tại (gộp theo invId để chính xác tuyệt đối)
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
    
    // Auto-match ingredients from inventory (only those with quantity > 0, no duplicates)
    const availableInventory = inventory.filter(i => i.quantity > 0);
    const matched: MealIngredientUsed[] = [];
    const usedIds = new Set<string>();
    recipe.ingredients.forEach(ingName => {
      const match = availableInventory.find(
        i => !usedIds.has(i.id) && (i.name.toLowerCase().includes(ingName.toLowerCase()) || ingName.toLowerCase().includes(i.name.toLowerCase()))
      );
      if (match) {
        usedIds.add(match.id);
        matched.push({ invId: match.id, qty: Math.min(1, match.quantity), name: match.name, unit: match.unit });
      }
    });
    setSelectedIngredients(matched);
    
    setIsModalOpen(true);
  };

  const openGlobalAddModal = () => {
    setEditingMeal(null);
    setEditingRecipe(null);
    if (activeTab === 'recipes') {
      setModalType('recipe');
      setFormName('');
      setFormIngredients('');
      setFormInstructions('');
      setIsModalOpen(true);
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
      // Deep copy để không làm biến đổi state gốc khi đang thao tác trong modal
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

  const calculateAI = async (mealId: string, name: string, ingredients: string, imageBase64?: string) => {
    try {
      await calculateMacros({
        mealId,
        food_name: name,
        ingredients_context: ingredients,
        image_data: imageBase64
      });
      fetchData(true, true); // reload silently to update AI status without full-page spinner flash
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

    const resolvedFoodName = formName.trim() || (formImageUrl ? 'Món ăn (AI đang nhận diện...)' : '');
    if (!resolvedFoodName) {
      showAlert("Vui lòng nhập tên món ăn hoặc tải ảnh bữa ăn lên!");
      return;
    }

    // Kiểm tra hợp lệ nguyên liệu kho trước khi gửi
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
      
      // Chỉ gọi AI khi tạo mới hoặc khi có thay đổi tên món / nguyên liệu / ghi chú / ảnh
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
            <label className={styles.formLabel}>Tên Công Thức</label>
            <SaoInput type="text"  placeholder="VD: Sườn xào chua ngọt" value={formName} onChange={e => setFormName(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nguyên liệu cơ bản (Cách nhau bằng dấu phẩy)</label>
            <SaoInput isTextarea  placeholder="VD: Sườn non, Hành tím, Tương cà..." rows={3} value={formIngredients} onChange={e => setFormIngredients(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Hướng dẫn nấu (Tùy chọn)</label>
            <SaoInput isTextarea  placeholder="VD: B1: Chặt sườn và chần nước sôi... B2: Nấu sốt..." rows={3} value={formInstructions} onChange={e => setFormInstructions(e.target.value)} />
          </div>
          <SaoButton variant="primary" type="submit" >
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> Lưu Công thức
          </SaoButton>
        </form>
      );
    }

    if (modalType === 'cook' || modalType === 'meal') {
      return (
        <form onSubmit={handleSaveMeal}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Hình ảnh bữa ăn (Tùy chọn, tải lên bất cứ lúc nào để AI phân tích)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {formImageUrl && (
                <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '6px', border: '1px solid #00f0ff', backgroundImage: `url(${formImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                  <button
                    type="button"
                    onClick={() => setFormImageUrl('')}
                    title="Xóa ảnh"
                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ff4444', color: '#fff', border: 'none', fontSize: '11px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              )}
              <SaoImageUpload onUploadSuccess={(url: string) => setFormImageUrl(url)} label={formImageUrl ? "Đổi ảnh" : "Tải ảnh lên"} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Tên món ăn {formImageUrl && <span style={{ color: '#00ffaa', fontSize: '0.8rem', fontWeight: 'normal' }}>(Có thể bỏ trống để AI tự nhận diện từ ảnh)</span>}
            </label>
            <SaoInput
              type="text"
              placeholder={formImageUrl ? "Bỏ trống để AI tự đặt tên theo ảnh, hoặc nhập tên món..." : "VD: Phở bò, Cơm tấm..."}
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required={modalType === 'meal' && !formImageUrl}
              readOnly={modalType === 'cook'}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Hình thức dùng bữa</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input type="radio" name="source" checked={formCookSource === 'home'} onChange={() => setFormCookSource('home')} />
                <Utensils size={16} style={{ marginBottom: 4 }} />
                <div>Nấu tại nhà</div>
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" name="source" checked={formCookSource === 'eat_out'} onChange={() => setFormCookSource('eat_out')} />
                <ShoppingBag size={16} style={{ marginBottom: 4 }} />
                <div>Ăn ngoài</div>
              </label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ngày</label>
              <SaoDatePicker value={formDate} onChange={setFormDate} required />
            </div>
          </div>

          {editingRecipe && (
            <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
              <label className={styles.formLabel} style={{ color: '#a0c4ff', marginBottom: 0 }}>Công thức gợi ý:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                {editingRecipe.ingredients.map((ing, i) => (
                  <span key={i} style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>{ing}</span>
                ))}
              </div>
              {editingRecipe.instructions && (
                <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #00f0ff', whiteSpace: 'pre-line', lineHeight: '1.45' }}>
                  <strong style={{ color: '#00f0ff', display: 'block', marginBottom: '4px' }}>Hướng dẫn nấu:</strong>
                  {editingRecipe.instructions}
                </div>
              )}
            </div>
          )}

          {formCookSource === 'home' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Lấy từ Dự trữ Kho (Sẽ bị trừ hoặc hoàn trả tương ứng khi lưu)</label>
              <div className={styles.ingredientCheckList}>
                {selectedIngredients.map((ing, idx) => {
                  const pool = getIngredientPoolInfo(ing.invId);
                  const rowEstimatedCost = estimateIngredientCost(ing.invId, ing.qty);
                  const isOverLimit = Number(ing.qty) > pool.effectivePoolQty + 1e-6;

                  // Xây dựng danh sách options gồm cả các món đã hết trong kho nhưng đang được dùng trong bữa ăn đang sửa
                  const optionIds = new Set<string>();
                  const selectOptions: { value: string; label: string }[] = [];

                  inventory.forEach(item => {
                    const p = getIngredientPoolInfo(item.id);
                    if (p.effectivePoolQty > 0 || item.id === ing.invId) {
                      optionIds.add(item.id);
                      let label = `${item.name} (Còn: ${p.currentStock} ${item.unit})`;
                      if (p.oldHeldQty > 0) {
                        if (p.currentStock <= 0) {
                          label = `${item.name} (Kho đã hết • Đang dùng: ${p.oldHeldQty} ${item.unit} → Tối đa: ${p.effectivePoolQty} ${item.unit})`;
                        } else {
                          label = `${item.name} (Kho: ${p.currentStock} + Đang dùng: ${p.oldHeldQty} → Tối đa: ${p.effectivePoolQty} ${item.unit})`;
                        }
                      }
                      selectOptions.push({ value: item.id, label });
                    }
                  });

                  // Phòng trường hợp món nguyên liệu cũ đã bị xóa khỏi kho sau 7 ngày hết hàng
                  if (ing.invId && !optionIds.has(ing.invId)) {
                    selectOptions.unshift({
                      value: ing.invId,
                      label: `${pool.name} (Đã xóa khỏi kho • Đang giữ: ${pool.effectivePoolQty} ${pool.unit})`
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
                        <span>
                          {isOverLimit
                            ? `⚠️ Vượt quá giới hạn khả dụng (Tối đa: ${pool.effectivePoolQty} ${pool.unit})`
                            : `Khả dụng tối đa: ${pool.effectivePoolQty} ${pool.unit}${pool.oldHeldQty > 0 && pool.currentStock === 0 ? ' (Món đã dùng hết trong kho)' : ''}`}
                        </span>
                        {rowEstimatedCost > 0 && (
                          <span style={{ color: '#00f0ff', fontWeight: 500 }}>
                            Thiệt hại kho: ≈ {rowEstimatedCost.toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <SaoButton variant="primary" 
                  type="button"
                  style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', border: '1px dashed #00f0ff', marginTop: '5px' }}
                  onClick={() => {
                    // Tìm các nguyên liệu có quỹ khả dụng > 0 (bao gồm cả món hết trong kho nhưng thuộc bữa đang sửa)
                    const allCandidates = inventory.filter(i => getIngredientPoolInfo(i.id).effectivePoolQty > 0);
                    if (allCandidates.length === 0) {
                      showAlert("Kho của bạn hiện không có nguyên liệu nào còn hàng!");
                      return;
                    }
                    // Ưu tiên chọn nguyên liệu chưa có trong danh sách đang chọn
                    const selectedIds = new Set(selectedIngredients.map(s => s.invId));
                    const unselectedCandidate = allCandidates.find(i => !selectedIds.has(i.id));
                    const chosen = unselectedCandidate || allCandidates.find(i => {
                      const usedQty = selectedIngredients
                        .filter(s => s.invId === i.id)
                        .reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
                      return getIngredientPoolInfo(i.id).effectivePoolQty - usedQty > 1e-6;
                    });

                    if (!chosen) {
                      showAlert("Tất cả nguyên liệu còn hàng trong kho đã được chọn hết số lượng khả dụng!");
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
                  <Plus size={16} style={{ display: 'inline', marginRight: 5 }} /> Thêm nguyên liệu từ Kho
                </SaoButton>

                {(selectedIngredients.length > 0 || (editingMeal && editingMeal.source === 'home' && (editingMeal.cost || 0) > 0)) && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 600 }}>
                      <span>Tổng thiệt hại kho tính toán:</span>
                      <span style={{ color: '#00f0ff', fontSize: '1rem' }}>{estimatedHomeTotalCost.toLocaleString('vi-VN')} VND</span>
                    </div>
                    {editingMeal && editingMeal.source === 'home' && (editingMeal.cost || 0) !== estimatedHomeTotalCost && (
                      <div style={{ fontSize: '0.78rem', color: '#ffaa00', marginTop: '4px' }}>
                        Chênh lệch so với trước khi sửa: {(editingMeal.cost || 0).toLocaleString('vi-VN')} VND → {estimatedHomeTotalCost.toLocaleString('vi-VN')} VND
                        {estimatedHomeTotalCost < (editingMeal.cost || 0)
                          ? ` (Hoàn lại kho ${( (editingMeal.cost || 0) - estimatedHomeTotalCost ).toLocaleString('vi-VN')} VND)`
                          : ` (Trừ thêm kho ${( estimatedHomeTotalCost - (editingMeal.cost || 0) ).toLocaleString('vi-VN')} VND)`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ghi chú thêm (VD: cho AI biết thêm nguyên liệu ngoài kho)</label>
            <SaoInput isTextarea  placeholder="Mô tả bổ sung..." rows={2} value={formActualIngredients} onChange={e => setFormActualIngredients(e.target.value)} />
          </div>

          {formCookSource === 'eat_out' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Số tiền (VND - Tùy chọn)</label>
                <SaoInput type="number" placeholder="Nhập số tiền (Bỏ trống nếu 0đ)..." value={formCost} onChange={e => setFormCost(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Chọn Ví trừ tiền</label>
                <SaoSelect
                  initialValue={formWalletId}
                  options={wallets.map(w => ({ value: w._id, label: `${w.name} (${w.balance.toLocaleString('vi-VN')} đ)` }))}
                  onChange={setFormWalletId}
                />
              </div>
            </>
          )}

          <SaoButton variant="primary" type="submit" >
            <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 8 }} /> {modalType === 'cook' ? 'Ghi nhận Nấu Món Này' : (editingMeal ? 'Lưu Sửa Đổi Bữa Ăn' : 'Lưu Bữa Ăn')}
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
          <h1 className={styles.title}>Thực Đơn</h1>
        </div>
      </div>

      <SaoTabs
        tabs={[
          { id: 'recipes', label: 'Công Thức', icon: <Utensils size={18} /> },
          { id: 'history', label: 'Lịch Sử', icon: <History size={18} /> },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as MenuTabId)}
      />

      <div className={styles.scrollArea}>
        {loading ? (
          <SaoLoading fullPage />
        ) : activeTab === 'recipes' ? (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div className={styles.recipesGrid}>
            {recipes.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', gridColumn: '1 / -1', padding: '40px' }}>
                Chưa có công thức nào. Nhấn nút + để thêm!
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
                    Nấu Món Này
                  </SaoButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }} className={styles.historyTimeline}>
           {Object.keys(groupedMeals).length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '40px' }}>
                Chưa có lịch sử ăn uống.
              </div>
            )}
          {Object.entries(groupedMeals).sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime()).map(([date, dayMeals]) => (
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
                          <button onClick={() => openEditMealModal(meal)} title="Chỉnh sửa bữa ăn" style={{ background: 'none', border: 'none', color: '#00f0ff', cursor: 'pointer', padding: '4px' }}>
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => confirmDeleteMeal(meal._id)} title="Xóa bữa ăn" style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className={styles.mealTimeType}>
                        <span>{meal.source === 'eat_out' ? 'Ăn ngoài' : 'Nấu tại nhà'}</span>
                        {meal.cost !== undefined && meal.cost > 0 && (
                          <span style={{ color: '#00f0ff' }} suppressHydrationWarning>
                            {' '}• {meal.source === 'home' ? 'Thiệt hại kho' : 'Chi phí'}: {meal.cost.toLocaleString('vi-VN')} VND
                          </span>
                        )}
                      </div>

                      {meal.source === 'home' && meal.ingredients_used && meal.ingredients_used.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {meal.ingredients_used.map((ing, i) => {
                            const invItem = inventory.find(item => item.id === ing.invId);
                            const name = ing.name || invItem?.name || 'Nguyên liệu kho';
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
                                title={isDepletedNow ? 'Món này trong kho hiện đã dùng hết (0)' : undefined}
                              >
                                {ing.qty} {unit} {name}
                                {ing.cost && ing.cost > 0 ? ` (-${ing.cost.toLocaleString('vi-VN')}đ)` : ''}
                                {isDepletedNow ? ' • Kho hết' : ''}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {cleanNote && (
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '5px' }}>
                          📝 Ghi chú: {cleanNote}
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
                          <Sparkles size={12} /> AI đang tính toán...
                        </div>
                      )}
                      {meal.ai_status === 'failed' && (
                        <div style={{ fontSize: '0.8rem', color: '#ff4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} /> Lỗi tính AI
                          <SaoButton 
                            type="button"
                            onClick={() => handleRetryAI(meal)}
                            style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', padding: '2px 6px', marginLeft: '6px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                          >
                            <RefreshCw size={10} /> Thử lại
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
                          ✏️ {meal.edit_note}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Nút cộng vạn năng */}
      <SaoButton
        variant="primary"
        className={styles.menuFab}
        onClick={openGlobalAddModal}
      >
        <Plus size={28} />
      </SaoButton>

      <SaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalType === 'cook' ? 'Chi tiết Nấu ăn' :
          modalType === 'recipe' ? (editingRecipe ? 'Sửa Công thức' : 'Thêm Công thức') :
          (editingMeal ? 'Chỉnh sửa Lịch sử Bữa ăn' : 'Ghi nhận Bữa ăn')
        }
      >
        {renderModalContent()}
      </SaoModal>

      {/* MODAL: XÁC NHẬN XÓA */}
      <SaoModal
        isOpen={!!mealToDelete}
        onClose={() => setMealToDelete(null)}
        title="Xác nhận xóa"
        icon={<AlertTriangle size={20} />}
      >
        <div style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '20px', lineHeight: '1.5' }}>
          Bạn có chắc chắn muốn xóa bữa ăn này không? Hành động này sẽ hoàn trả nguyên liệu hoặc hoàn lại tiền ví tương ứng và không thể hoàn tác.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <SaoButton variant="default" onClick={() => setMealToDelete(null)} type="button">
            Hủy
          </SaoButton>
          <SaoButton variant="danger" onClick={handleDeleteMeal} type="button">
            <Trash2 size={16} /> Xóa
          </SaoButton>
        </div>
      </SaoModal>
    </div>
  );
}
