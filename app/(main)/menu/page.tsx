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
import { getRecipes, getMeals, getInventory, calculateMacros, createRecipe, createMeal, getWallets, updateMeal, deleteMeal } from './api';
import styles from './menu.module.css';

import { MenuTabId, Recipe, MealRecord, InventoryItem } from '@/lib/types';

interface Wallet {
  _id: string;
  name: string;
  balance: number;
}

export default function MenuPage() {
  const { showAlert, showConfirm } = useSaoAlert();
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
  const [formCookSource, setFormCookSource] = useState<'home' | 'eat_out'>('home');
  const [formDate, setFormDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [formActualIngredients, setFormActualIngredients] = useState(''); 
  const [formCost, setFormCost] = useState('');
  const [formWalletId, setFormWalletId] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<{invId: string, qty: number}[]>([]);
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (force = false) => {
    setLoading(true);
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
    setLoading(false);
  };

  const groupedMeals = meals.reduce((acc, meal) => {
    const date = new Date(new Date(meal.consumed_at).getTime() - new Date(meal.consumed_at).getTimezoneOffset() * 60000).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(meal);
    return acc;
  }, {} as Record<string, MealRecord[]>);

  const openCookModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormName(recipe.name);
    setFormActualIngredients('');
    setModalType('cook');
    setFormCookSource('home');
    setFormDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setFormCost('');
    setImageFile(null);
    
    // Auto-match ingredients from inventory
    const matched: {invId: string, qty: number}[] = [];
    recipe.ingredients.forEach(ingName => {
      const match = inventory.find(i => i.name.toLowerCase().includes(ingName.toLowerCase()) || ingName.toLowerCase().includes(i.name.toLowerCase()));
      if (match) matched.push({ invId: match.id, qty: 1 });
    });
    setSelectedIngredients(matched);
    
    setIsModalOpen(true);
  };

  const openGlobalAddModal = () => {
    if (activeTab === 'recipes') {
      setModalType('recipe');
      setEditingRecipe(null);
      setFormName('');
      setFormIngredients('');
      setIsModalOpen(true);
    } else {
      setModalType('meal');
      setFormName('');
      setFormActualIngredients('');
      setFormCookSource('home');
      setFormDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
      setFormCost('');
      setFormWalletId('');
      setSelectedIngredients([]);
      setEditingMeal(null);
      setImageFile(null);
      setIsModalOpen(true);
    }
  };

  const openEditMealModal = (meal: MealRecord) => {
    setEditingMeal(meal);
    setModalType('meal');
    setFormName(meal.food_name);
    setFormCookSource(meal.source);
    setFormDate(meal.consumed_at ? new Date(new Date(meal.consumed_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormCost(meal.cost ? meal.cost.toString() : '');
    setFormWalletId(meal.wallet_id || '');
    setFormActualIngredients((meal as any).ingredients_text || '');
    if (meal.source === 'home' && (meal as any).ingredients_used) {
      setSelectedIngredients((meal as any).ingredients_used);
    } else {
      setSelectedIngredients([]);
    }
    setImageFile(null);
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
      fetchData(true);
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
      fetchData(true); // reload regardless to update status
    } catch (e) {
      fetchData(true);
    }
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRecipe({
        name: formName,
        ingredients: formIngredients.split(',').map(s => s.trim()).filter(Boolean)
      });
      setIsModalOpen(false);
      fetchData(true);
    } catch (e) {
      showAlert("Lỗi lưu công thức");
    }
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let ingredients_context = formActualIngredients;
    if (formCookSource === 'home' && selectedIngredients.length > 0) {
      const textParts = selectedIngredients.map(ing => {
        const item = inventory.find(i => i.id === ing.invId);
        return item ? `${ing.qty}${item.unit} ${item.name}` : '';
      }).filter(Boolean);
      const autoContext = textParts.join(', ');
      
      if (ingredients_context) {
        ingredients_context = autoContext + ". Bổ sung: " + ingredients_context;
      } else {
        ingredients_context = autoContext;
      }
    }

    try {
      let data: any;
      if (editingMeal) {
        data = await updateMeal(editingMeal._id, {
          food_name: formName,
          consumed_at: formDate,
          source: formCookSource,
          ingredients_used: selectedIngredients,
          ingredients_text: ingredients_context,
          cost: formCookSource === 'eat_out' ? Number(formCost) || 0 : undefined,
          wallet_id: formCookSource === 'eat_out' ? formWalletId : undefined
        });
        setMeals(meals.map(m => m._id === editingMeal._id ? data.mealLog : m));
      } else {
        data = await createMeal({
          food_name: formName,
          consumed_at: formDate,
          source: formCookSource,
          recipe_id: editingRecipe ? editingRecipe._id : undefined,
          ingredients_used: selectedIngredients,
          ingredients_text: ingredients_context,
          cost: formCookSource === 'eat_out' ? Number(formCost) || 0 : undefined,
          wallet_id: formCookSource === 'eat_out' ? formWalletId : undefined
        });
        setMeals([data.mealLog, ...meals]);
      }
      
      setIsModalOpen(false);
      
      let imageBase64;
      if (formCookSource === 'eat_out' && imageFile) {
        imageBase64 = await fileToBase64(imageFile);
      }
      
      // Send AI request (which will also call fetchData(true) to sync)
      calculateAI(data.mealLog._id, formName, ingredients_context, imageBase64);
      
      // Update local state temporarily, or just let fetchData(true) handle it.
      // We also do fetchData(true) directly here to guarantee instant UI update
      fetchData(true);
    } catch (e: any) {
      showAlert(e.response?.data?.error || "Lỗi lưu bữa ăn");
    }
  };

  const handleRetryAI = (meal: MealRecord) => {
    setMeals(meals.map(m => m._id === meal._id ? { ...m, ai_status: 'pending' } : m));
    // Since we don't save ingredients_context to db for history currently, we just send name.
    calculateAI(meal._id, meal.food_name, ""); 
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
            <label className={styles.formLabel}>Tên món ăn</label>
            <SaoInput type="text"  value={formName} onChange={e => setFormName(e.target.value)} required={modalType === 'meal'} readOnly={modalType === 'cook'} />
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
            </div>
          )}

          {formCookSource === 'home' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Lấy từ Dự trữ Kho (Sẽ bị trừ khi lưu)</label>
              <div className={styles.ingredientCheckList}>
                {selectedIngredients.map((ing, idx) => {
                  const invItem = inventory.find(i => i.id === ing.invId);
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ flex: 2 }}>
                        <SaoSelect
                          initialValue={ing.invId}
                          options={inventory.map(i => ({ value: i.id, label: `${i.name} (Còn: ${i.quantity} ${i.unit})` }))}
                          onChange={(val) => {
                            const newArr = [...selectedIngredients];
                            newArr[idx].invId = val;
                            setSelectedIngredients(newArr);
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <SaoInput 
                          type="number" 
                          step="any"
                           
                          value={ing.qty} 
                          onChange={(e) => {
                            const newArr = [...selectedIngredients];
                            newArr[idx].qty = Number(e.target.value);
                            setSelectedIngredients(newArr);
                          }}
                          style={{ padding: '8px' }}
                        />
                        <span style={{ color: '#a0c4ff', fontSize: '0.9rem' }}>{invItem?.unit || '?'}</span>
                      </div>
                      <SaoButton 
                        type="button" 
                        onClick={() => setSelectedIngredients(selectedIngredients.filter((_, i) => i !== idx))}
                        style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={18} />
                      </SaoButton>
                    </div>
                  );
                })}
                <SaoButton variant="primary" 
                  type="button"
                  
                  style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', border: '1px dashed #00f0ff', marginTop: '5px' }}
                  onClick={() => setSelectedIngredients([...selectedIngredients, { invId: inventory[0]?.id || '', qty: 1 }])}
                >
                  <Plus size={16} style={{ display: 'inline', marginRight: 5 }} /> Thêm nguyên liệu từ Kho
                </SaoButton>
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
                <label className={styles.formLabel}>Hình ảnh bữa ăn (Tùy chọn, giúp AI phân tích tốt hơn)</label>
                <SaoInput type="file" accept="image/*" onChange={(e: any) => {
                  const file = e.target.files?.[0];
                  if (file) setImageFile(file);
                }} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Số tiền (VND)</label>
                <SaoInput type="number" placeholder="Nhập số tiền..." value={formCost} onChange={e => setFormCost(e.target.value)} required />
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
            <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 8 }} /> {modalType === 'cook' ? 'Ghi nhận Nấu Món Này' : 'Lưu Bữa Ăn'} (Gửi AI)
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
                {dayMeals.map(meal => (
                  <div key={meal._id} className={styles.mealCard}>
                    <div className={styles.mealIcon}>
                      {meal.source === 'eat_out' ? <ShoppingBag size={20} /> : <ChefHat size={20} />}
                    </div>
                    <div className={styles.mealInfo}>
                      <div className="flex justify-between items-start">
                        <div className={styles.mealName}>{meal.food_name}</div>
                        <div className="flex gap-2">
                          <button onClick={() => openEditMealModal(meal)} style={{ background: 'none', border: 'none', color: '#00f0ff', cursor: 'pointer', padding: '4px' }}>
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => confirmDeleteMeal(meal._id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className={styles.mealTimeType}>
                        <span>{meal.source === 'eat_out' ? 'Ăn ngoài' : 'Nấu tại nhà'}</span>
                        {meal.cost !== undefined && meal.cost > 0 && (
                          <span style={{ color: '#00f0ff' }} suppressHydrationWarning> • Chi phí: {meal.cost.toLocaleString('vi-VN')} VND</span>
                        )}
                      </div>
                      
                      {meal.ai_status === 'completed' && (
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#a0c4ff', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span title="Calories" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Flame size={12} /> {meal.calo} Kcal</span>
                          <span title="Protein" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Beef size={12} /> {meal.protein}g</span>
                          <span title="Fat" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Droplet size={12} /> {meal.fat}g</span>
                          <span title="Carbs" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Wheat size={12} /> {meal.carbs}g</span>
                          <span title="Sugar" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Candy size={12} /> {meal.sugar}g</span>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Nút cộng vạn năng */}
      <SaoButton variant="primary" style={{borderRadius: "50%", width: 50, height: 50, position: "fixed", bottom: 30, right: 30, zIndex: 100, boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)"}}  onClick={openGlobalAddModal}>
        <Plus size={32} />
      </SaoButton>

      <SaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalType === 'cook' ? 'Chi tiết Nấu ăn' :
          modalType === 'recipe' ? (editingRecipe ? 'Sửa Công thức' : 'Thêm Công thức') :
          'Ghi nhận Bữa ăn'
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
