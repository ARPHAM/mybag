"use client";

import { useState } from 'react';
import { ChefHat, Flame, Clock, Plus, Edit3, Utensils, History, Sparkles, Save, CheckCircle2, ShoppingBag, Trash2 } from 'lucide-react';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoSelect from '../../components/SaoSelect/SaoSelect';
import SaoTabs from '../../components/SaoTabs/SaoTabs';
import SaoDatePicker from '../../components/SaoDatePicker/SaoDatePicker';
import styles from './menu.module.css';

type TabId = 'recipes' | 'history';

interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  estimatedCalo: number | 'AI Đang tính...';
}

interface MealRecord {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  source: 'home' | 'eat_out';
  name: string;
  calo: number | 'AI Đang tính...';
  cost?: number;
}

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState<TabId>('recipes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'cook' | 'recipe' | 'meal'>('cook');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  
  // States for the "Cook" form
  const [cookSource, setCookSource] = useState<'home' | 'eat_out'>('home');
  const [selectedIngredients, setSelectedIngredients] = useState<{invId: string, qty: number}[]>([]);

  // Dummy Data
  const [inventory] = useState([
    { id: 'i1', name: 'Gạo ST25', category: 'food', quantity: 5, unit: 'kg', totalValue: 150000 },
    { id: 'i2', name: 'Thịt lợn (Ba chỉ)', category: 'food', quantity: 1, unit: 'kg', totalValue: 120000 },
    { id: 'i3', name: 'Trứng vịt', category: 'food', quantity: 10, unit: 'quả', totalValue: 35000 },
    { id: 'i4', name: 'Hành lá', category: 'spices', quantity: 5, unit: 'mớ', totalValue: 10000 },
    { id: 'i5', name: 'Cá lóc', category: 'food', quantity: 1, unit: 'con', totalValue: 60000 },
    { id: 'i6', name: 'Ức gà', category: 'food', quantity: 2, unit: 'kg', totalValue: 160000 },
  ]);
  const [recipes] = useState<Recipe[]>([
    { id: 'r1', name: 'Thịt kho trứng', ingredients: ['Thịt lợn (Ba chỉ)', 'Trứng vịt', 'Hành lá', 'Nước mắm', 'Đường'], estimatedCalo: 850 },
    { id: 'r2', name: 'Canh chua cá lóc', ingredients: ['Cá lóc', 'Cà chua', 'Dứa', 'Đậu bắp', 'Giá đỗ', 'Me'], estimatedCalo: 420 },
    { id: 'r3', name: 'Salad Ức gà', ingredients: ['Ức gà', 'Xà lách', 'Cà chua bi', 'Sốt mè rang'], estimatedCalo: 350 },
    { id: 'r4', name: 'Bò xào lúc lắc', ingredients: ['Thịt bò', 'Hành tây', 'Ớt chuông', 'Tương cà'], estimatedCalo: 600 },
  ]);

  const [meals] = useState<MealRecord[]>([
    { id: 'm1', date: '2023-11-05', mealType: 'dinner', source: 'home', name: 'Thịt kho trứng', calo: 850 },
    { id: 'm2', date: '2023-11-05', mealType: 'lunch', source: 'eat_out', name: 'Cơm tấm sườn bì', calo: 900, cost: 45000 },
    { id: 'm3', date: '2023-11-05', mealType: 'breakfast', source: 'home', name: 'Salad Ức gà', calo: 350 },
  ]);

  // Group meals by date
  const groupedMeals = meals.reduce((acc, meal) => {
    if (!acc[meal.date]) acc[meal.date] = [];
    acc[meal.date].push(meal);
    return acc;
  }, {} as Record<string, MealRecord[]>);

  const getMealTypeTag = (type: string) => {
    switch(type) {
      case 'breakfast': return <span className={`${styles.mealTypeTag} ${styles.tagBreakfast}`}>Buổi Sáng</span>;
      case 'lunch': return <span className={`${styles.mealTypeTag} ${styles.tagLunch}`}>Buổi Trưa</span>;
      case 'dinner': return <span className={`${styles.mealTypeTag} ${styles.tagDinner}`}>Buổi Tối</span>;
      default: return <span className={`${styles.mealTypeTag} ${styles.tagSnack}`}>Ăn Vặt</span>;
    }
  };

  const openCookModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setModalType('cook');
    setCookSource('home');
    
    // Auto-match ingredients for convenience
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
      setIsModalOpen(true);
    } else {
      setModalType('meal');
      setIsModalOpen(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
  };

  const renderModalContent = () => {
    if (modalType === 'cook' && editingRecipe) {
      return (
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Món ăn: <span style={{ color: '#fff' }}>{editingRecipe.name}</span></label>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Hình thức dùng bữa</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input type="radio" name="source" checked={cookSource === 'home'} onChange={() => setCookSource('home')} />
                <Utensils size={16} style={{ marginBottom: 4 }} />
                <div>Nấu tại nhà</div>
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" name="source" checked={cookSource === 'eat_out'} onChange={() => setCookSource('eat_out')} />
                <ShoppingBag size={16} style={{ marginBottom: 4 }} />
                <div>Ăn ngoài / Đặt món</div>
              </label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bữa ăn</label>
              <SaoSelect
                initialValue="lunch"
                options={[
                  { value: 'breakfast', label: 'Buổi Sáng' },
                  { value: 'lunch', label: 'Buổi Trưa' },
                  { value: 'dinner', label: 'Buổi Tối' },
                  { value: 'snack', label: 'Ăn vặt' }
                ]}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ngày (Mặc định hôm nay)</label>
              <SaoDatePicker defaultValue={new Date().toISOString().split('T')[0]} required />
            </div>
          </div>

          {cookSource === 'home' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nguyên liệu sử dụng từ Kho</label>
              <div className={styles.ingredientCheckList}>
                {selectedIngredients.map((ing, idx) => {
                  const invItem = inventory.find(i => i.id === ing.invId);
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ flex: 2 }}>
                        <SaoSelect
                          initialValue={ing.invId}
                          options={inventory.map(i => ({ value: i.id, label: `${i.name} (Kho: ${i.quantity} ${i.unit})` }))}
                          onChange={(val) => {
                            const newArr = [...selectedIngredients];
                            newArr[idx].invId = val;
                            setSelectedIngredients(newArr);
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input 
                          type="number" 
                          className={styles.formInput} 
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
                      <button 
                        type="button" 
                        onClick={() => setSelectedIngredients(selectedIngredients.filter((_, i) => i !== idx))}
                        style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
                <button 
                  type="button"
                  className={styles.submitBtn}
                  style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', border: '1px dashed #00f0ff', marginTop: '5px' }}
                  onClick={() => setSelectedIngredients([...selectedIngredients, { invId: inventory[0]?.id, qty: 1 }])}
                >
                  <Plus size={16} style={{ display: 'inline', marginRight: 5 }} /> Thêm nguyên liệu
                </button>
                
                {/* Cost Calculation */}
                {(() => {
                  const totalCost = selectedIngredients.reduce((sum, ing) => {
                    const invItem = inventory.find(i => i.id === ing.invId);
                    if (invItem && invItem.quantity > 0) {
                      return sum + (invItem.totalValue / invItem.quantity) * ing.qty;
                    }
                    return sum;
                  }, 0);
                  return (
                    <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', textAlign: 'right' }}>
                      <span style={{ color: '#a0c4ff' }}>Ước tính chi phí món ăn: </span>
                      <strong style={{ color: '#fff', fontSize: '1.2rem' }}>{totalCost.toLocaleString()} VND</strong>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {cookSource === 'eat_out' && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Chi phí (VND)</label>
                <input type="number" className={styles.formInput} placeholder="VD: 50000" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nguồn tiền</label>
                <SaoSelect
                  placeholder="Chọn nguồn..."
                  options={[
                    { value: 'cash', label: 'Tiền mặt' },
                    { value: 'momo', label: 'Momo' },
                    { value: 'bank', label: 'Ngân hàng' }
                  ]}
                />
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Lượng Calo</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" className={styles.formInput} defaultValue={editingRecipe.estimatedCalo} />
              <button type="button" className={styles.submitBtn} style={{ width: 'auto', marginTop: 0, background: 'rgba(255, 170, 0, 0.2)', color: '#ffaa00', border: '1px solid #ffaa00' }}>
                <Sparkles size={18} /> AI Scan
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>
            <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 8 }} /> Ghi nhận vào Lịch sử
          </button>
        </form>
      );
    }

    if (modalType === 'recipe') {
      return (
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tên Công Thức</label>
            <input type="text" className={styles.formInput} placeholder="VD: Sườn xào chua ngọt" required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nguyên liệu (Cách nhau bằng dấu phẩy)</label>
            <textarea className={styles.formInput} placeholder="VD: Sườn non, Hành tím, Tương cà..." rows={3} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Calo ước tính</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" className={styles.formInput} placeholder="Tùy chọn" />
              <button type="button" className={styles.submitBtn} style={{ width: 'auto', marginTop: 0, background: 'rgba(255, 170, 0, 0.2)', color: '#ffaa00', border: '1px solid #ffaa00' }}>
                <Sparkles size={18} /> Nhờ AI tính
              </button>
            </div>
          </div>
          <button type="submit" className={styles.submitBtn}>
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> Lưu Công thức
          </button>
        </form>
      );
    }

    if (modalType === 'meal') {
      return (
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tên món ăn / Bữa ăn</label>
            <input type="text" className={styles.formInput} placeholder="VD: Bún bò Huế" required />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bữa ăn</label>
              <SaoSelect
                initialValue="lunch"
                options={[
                  { value: 'breakfast', label: 'Buổi Sáng' },
                  { value: 'lunch', label: 'Buổi Trưa' },
                  { value: 'dinner', label: 'Buổi Tối' },
                  { value: 'snack', label: 'Ăn vặt' }
                ]}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ngày</label>
              <SaoDatePicker defaultValue={new Date().toISOString().split('T')[0]} required />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Lượng Calo</label>
              <input type="text" className={styles.formInput} placeholder="Tùy chọn" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Chi phí (Ăn ngoài - Tùy chọn)</label>
              <input type="number" className={styles.formInput} placeholder="VND" />
            </div>
          </div>
          <button type="submit" className={styles.submitBtn}>
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> Ghi nhận
          </button>
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
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {activeTab === 'recipes' && (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div className={styles.recipesGrid}>
            {recipes.map(recipe => (
              <div key={recipe.id} className={styles.recipeCard}>
                <button className={styles.editBtn} title="Chỉnh sửa công thức" onClick={() => { setEditingRecipe(recipe); setModalType('recipe'); setIsModalOpen(true); }}>
                  <Edit3 size={16} />
                </button>
                <div className={styles.recipeImage}>
                  <Utensils size={64} color="#00f0ff" strokeWidth={1} />
                </div>
                <div className={styles.recipeContent}>
                  <div className={styles.recipeName}>{recipe.name}</div>
                  <div className={styles.recipeMeta}>
                    <span title="Năng lượng ước tính"><Flame size={14} style={{ display: 'inline' }} /> {recipe.estimatedCalo} Kcal</span>
                    <span title="Thời gian"><Clock size={14} style={{ display: 'inline' }} /> 30m</span>
                  </div>
                  <div className={styles.recipeIngredients}>
                    {recipe.ingredients.map((ing, i) => (
                      <span key={i} className={styles.ingredientTag}>{ing}</span>
                    ))}
                  </div>
                  <button className={styles.cookBtn} onClick={() => openCookModal(recipe)}>
                    Nấu Món Này
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }} className={styles.historyTimeline}>
          {Object.entries(groupedMeals).sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime()).map(([date, dayMeals]) => (
            <div key={date} className={styles.timelineDay}>
              <div className={styles.timelineDate}>{date === '2023-11-05' ? 'Hôm nay - 05/11/2023' : date}</div>
              <div className={styles.mealCards}>
                {dayMeals.map(meal => (
                  <div key={meal.id} className={styles.mealCard}>
                    <div className={styles.mealIcon}>
                      {meal.source === 'eat_out' ? <ShoppingBag size={20} /> : <ChefHat size={20} />}
                    </div>
                    <div className={styles.mealInfo}>
                      <div className={styles.mealName}>{meal.name}</div>
                      <div className={styles.mealTimeType}>
                        {getMealTypeTag(meal.mealType)}
                        <span>•</span>
                        <span>{meal.source === 'eat_out' ? 'Ăn ngoài' : 'Nấu tại nhà'}</span>
                      </div>
                    </div>
                    <div className={styles.mealStats}>
                      <div className={styles.mealCalo}>{meal.calo} <small style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#a0c4ff' }}>Kcal</small></div>
                      {meal.cost && <div className={styles.mealCost}>- {meal.cost.toLocaleString()} VND</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nút cộng vạn năng */}
      <button className={styles.floatingActionBtn} onClick={openGlobalAddModal}>
        <Plus size={32} />
      </button>

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
    </div>
  );
}
