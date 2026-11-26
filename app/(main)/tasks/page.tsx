"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Check, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  X, 
  Clock, 
  Filter,
  Flame, 
  Award,
  Sparkles
} from 'lucide-react';
import styles from './tasks.module.css';
import SaoModal from '@/app/components/SaoModal';
import SaoLoading from '@/app/components/SaoLoading';
import SaoDatePicker from '@/app/components/SaoDatePicker';
import SaoSelect from '@/app/components/SaoSelect';
import SaoInput from '@/app/components/SaoInput';
import SaoButton from '@/app/components/SaoButton';
import SaoSearchInput from '@/app/components/SaoSearchInput';
import SaoSummaryCard from '@/app/components/SaoSummaryCard';
import SaoTaskCard from '@/app/components/tasks/SaoTaskCard';
import SaoFab from '@/app/components/SaoFab';
import SaoConfirmModal from '@/app/components/SaoConfirmModal';
import { useSaoAlert } from '../../contexts/AlertContext';
import { useI18n } from '../../contexts/I18nContext';
import { getTasks, createTask, updateTask, deleteTask } from './api';

import { Task } from '@/lib/types';
import { TASK_RANK_OPTIONS } from '@/lib/constants';

const RANK_EXP_MAP: Record<string, number> = {
  S: 1000,
  A: 600,
  B: 300,
  C: 150,
  D: 50
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { showAlert } = useSaoAlert();
  const { t } = useI18n();

  useEffect(() => {
    fetchTasks();
    const handleUpdate = () => fetchTasks(true);
    window.addEventListener('sao-tasks-updated', handleUpdate);
    return () => window.removeEventListener('sao-tasks-updated', handleUpdate);
  }, []);

  const fetchTasks = async (force = false) => {
    try {
      const data: any = await getTasks(force);
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quest_rank: 'C',
    due_date_date: '',
    due_date_time: '23:59'
  });

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    
    // Optimistic UI Update
    setTasks(prevTasks => prevTasks.map(t => 
      t._id === task._id ? { ...t, status: newStatus } : t
    ));

    try {
      const data: any = await updateTask(task._id, { status: newStatus });
      if (data.reward?.leveledUp) {
        showAlert(`${t('tasks.levelUp')} ${data.reward.newLevel}!`);
      } else if (data.penalty?.leveledDown) {
        showAlert(`${t('tasks.levelDown')} ${data.penalty.newLevel}!`);
      }
      window.dispatchEvent(new CustomEvent('sao-user-updated'));
      fetchTasks(true);
    } catch (err) {
      console.error(err);
      // Revert Optimistic UI Update on failure
      setTasks(prevTasks => prevTasks.map(t => 
        t._id === task._id ? { ...t, status: task.status } : t
      ));
    }
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTaskToDelete(id);
  };

  const handleDelete = async () => {
    if (taskToDelete) {
      try {
        await deleteTask(taskToDelete);
        fetchTasks(true);
      } catch (err) {
        console.error(err);
      }
      setTaskToDelete(null);
    }
  };

  const openAddModal = () => {
    setEditingTask(null);
    setFormData({ 
      title: '', 
      description: '', 
      quest_rank: 'C', 
      due_date_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      due_date_time: '23:59'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    const dueDateObj = new Date(task.due_date);
    const tzOffset = dueDateObj.getTimezoneOffset() * 60000;
    const localISOTime = new Date(dueDateObj.getTime() - tzOffset).toISOString().slice(0, 16);
    const [datePart, timePart] = localISOTime.split('T');

    setFormData({
      title: task.title,
      description: task.description || '',
      quest_rank: task.quest_rank,
      due_date_date: datePart,
      due_date_time: timePart
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const [hourStr, minuteStr] = formData.due_date_time.split(':');
    if (!hourStr || !minuteStr) {
      alert("Vui lòng điền đầy đủ giờ và phút.");
      return;
    }

    const [year, month, day] = formData.due_date_date.split('-').map(Number);
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    const dateObj = new Date(year, month - 1, day, hour, minute);
    const finalDueDate = dateObj.toISOString();
    
    if (!formData.title.trim() || !formData.due_date_date) return;

    setIsSubmitting(true);
    try {
      if (editingTask) {
        await updateTask(editingTask._id, {
          title: formData.title,
          description: formData.description,
          quest_rank: formData.quest_rank,
          due_date: finalDueDate
        });
      } else {
        await createTask({ 
          title: formData.title, 
          description: formData.description,
          quest_rank: formData.quest_rank, 
          due_date: finalDueDate 
        });
      }
      closeModal();
      fetchTasks(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      closeModal();
    }
  };

  // Metrics
  const completedCount = useMemo(() => tasks.filter(t => t.status === 'COMPLETED').length, [tasks]);
  const overdueCount = useMemo(() => tasks.filter(t => 
    t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && new Date(t.due_date).getTime() < Date.now())
  ).length, [tasks]);
  const pendingCount = useMemo(() => tasks.filter(t => 
    t.status === 'PENDING' && new Date(t.due_date).getTime() >= Date.now()
  ).length, [tasks]);
  const totalCount = tasks.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const pendingExp = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'COMPLETED')
      .reduce((sum, t) => sum + (RANK_EXP_MAP[t.quest_rank] || 50), 0);
  }, [tasks]);

  const earnedExp = useMemo(() => {
    return tasks
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + (RANK_EXP_MAP[t.quest_rank] || 50), 0);
  }, [tasks]);

  // Filter options configuration
  const filterOptions = useMemo(() => [
    { value: 'all', label: `${t('common.all')} (${tasks.length})` },
    { value: 'pending', label: `${t('tasks.pending')} (${pendingCount})` },
    { value: 'completed', label: `${t('tasks.completed')} (${completedCount})` },
    ...(overdueCount > 0 ? [{ value: 'overdue', label: `${t('tasks.overdue')} (${overdueCount})` }] : [])
  ], [t, tasks.length, pendingCount, completedCount, overdueCount]);

  // Filtered & Searched tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const isOverdue = task.status === 'OVERDUE' || (task.status !== 'COMPLETED' && new Date(task.due_date).getTime() < Date.now());

      if (filterTab === 'pending') {
        if (task.status === 'COMPLETED' || isOverdue) return false;
      } else if (filterTab === 'completed') {
        if (task.status !== 'COMPLETED') return false;
      } else if (filterTab === 'overdue') {
        if (!isOverdue) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        const matchRank = `rank ${task.quest_rank}`.toLowerCase().includes(q) || task.quest_rank.toLowerCase() === q;
        return matchTitle || matchDesc || matchRank;
      }

      return true;
    });
  }, [tasks, filterTab, searchQuery]);

  return (
    <div className={styles.tasksContainer}>
      {/* ========================================================
         1.A. BẢN DESKTOP: BỘ 3 THẺ TỔNG QUAN TIẾN ĐỘ NHIỆM VỤ
         ======================================================== */}
      <div className={styles.desktopStats}>
        <SaoSummaryCard
          title={t('tasks.pending')}
          amount={pendingCount}
          currency={t('tasks.tasksCount')}
          icon={<Clock size={18} />}
          subText={`${t('tasks.expReward')}: +${pendingExp}`}
          variant="balance"
          onClick={() => setFilterTab('pending')}
        />

        <SaoSummaryCard
          title={t('tasks.completed')}
          amount={completedCount}
          currency={`/${totalCount}`}
          icon={<CheckSquare size={18} />}
          subText={`${t('tasks.expEarned')}: +${earnedExp} EXP`}
          variant="income"
          onClick={() => setFilterTab('completed')}
        />

        {overdueCount > 0 ? (
          <SaoSummaryCard
            title={t('tasks.overdue')}
            amount={overdueCount}
            currency={t('tasks.overdueUnit')}
            icon={<AlertTriangle size={18} />}
            subText={t('tasks.expPenalty')}
            variant="expense"
            onClick={() => setFilterTab('overdue')}
            className={styles.thirdMetricCard}
          />
        ) : (
          <SaoSummaryCard
            title={t('tasks.progress')}
            amount={`${progressPercent}%`}
            currency=""
            icon={<Award size={18} />}
            subText={`${completedCount}/${totalCount} ${t('tasks.completedRatio')}`}
            variant="primary"
            onClick={() => setFilterTab('all')}
            className={styles.thirdMetricCard}
          />
        )}
      </div>

      {/* ========================================================
         1.B. BẢN MOBILE: KHUNG TỔNG HỢP 3 TRONG 1 COMPACT HUD (TIẾT KIỆM KHÔNG GIAN)
         ======================================================== */}
      <div className={styles.mobileStatsCard}>
        {/* Cột 1: Đang làm */}
        <div 
          className={`${styles.mobileStatCol} ${filterTab === 'pending' ? styles.colActivePending : ''}`}
          onClick={() => setFilterTab('pending')}
          role="button"
          tabIndex={0}
        >
          <div className={`${styles.mobileStatHeader} ${styles.headerPending}`}>
            <Clock size={12} />
            <span>{t('tasks.pending')}</span>
          </div>
          <div className={styles.mobileStatBody}>
            <span className={styles.mobileStatVal}>{pendingCount}</span>
            <span className={styles.mobileStatUnit}>{t('tasks.tasksUnit')}</span>
          </div>
          <div className={styles.mobileStatSubPending}>+{pendingExp} EXP</div>
        </div>

        <div className={styles.mobileStatDivider} />

        {/* Cột 2: Đã xong */}
        <div 
          className={`${styles.mobileStatCol} ${filterTab === 'completed' ? styles.colActiveCompleted : ''}`}
          onClick={() => setFilterTab('completed')}
          role="button"
          tabIndex={0}
        >
          <div className={`${styles.mobileStatHeader} ${styles.headerCompleted}`}>
            <CheckSquare size={12} />
            <span>{t('tasks.completed')}</span>
          </div>
          <div className={styles.mobileStatBody}>
            <span className={`${styles.mobileStatVal} ${styles.valCompleted}`}>{completedCount}</span>
            <span className={styles.mobileStatUnit}>/{totalCount}</span>
          </div>
          <div className={styles.mobileStatSubCompleted}>+{earnedExp} EXP</div>
        </div>

        <div className={styles.mobileStatDivider} />

        {/* Cột 3: Quá hạn / Tiến độ */}
        {overdueCount > 0 ? (
          <div 
            className={`${styles.mobileStatCol} ${filterTab === 'overdue' ? styles.colActiveOverdue : ''}`}
            onClick={() => setFilterTab('overdue')}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.mobileStatHeader} ${styles.headerOverdue}`}>
              <AlertTriangle size={12} />
              <span>{t('tasks.overdue')}</span>
            </div>
            <div className={styles.mobileStatBody}>
              <span className={`${styles.mobileStatVal} ${styles.valOverdue}`}>{overdueCount}</span>
              <span className={styles.mobileStatUnit}>{t('tasks.overdueUnitMobile')}</span>
            </div>
            <div className={styles.mobileStatSubOverdue}>{t('tasks.expPenaltyMobile')}</div>
          </div>
        ) : (
          <div 
            className={`${styles.mobileStatCol} ${filterTab === 'all' ? styles.colActivePrimary : ''}`}
            onClick={() => setFilterTab('all')}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.mobileStatHeader} ${styles.headerPrimary}`}>
              <Award size={12} />
              <span>{t('tasks.progress')}</span>
            </div>
            <div className={styles.mobileStatBody}>
              <span className={styles.mobileStatVal}>{progressPercent}%</span>
            </div>
            <div className={styles.mobileStatSubPrimary}>{completedCount}/{totalCount} {t('tasks.completedRatioMobile')}</div>
          </div>
        )}

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
         2. THANH CÔNG CỤ: TÌM KIẾM & BỘ LỌC CÙNG 1 DÒNG (SEARCH TRƯỚC)
         ======================================================== */}
      <div className={styles.toolbar}>
        <div className={styles.filtersWrapper}>
          <SaoSearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('tasks.searchPlaceholder')}
            className={styles.searchInput}
          />

          <SaoSelect
            icon={<Filter size={14} />}
            options={filterOptions}
            value={filterTab}
            onChange={(val) => setFilterTab(val as any)}
            className={styles.filterSelect}
          />
        </div>
      </div>

      {/* ========================================================
         3. DANH SÁCH THẺ NHIỆM VỤ SAO CYBER HUD
         ======================================================== */}
      <div className={styles.taskList}>
        {isLoading ? (
          <SaoLoading fullPage />
        ) : filteredTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconBox}>
              <CheckSquare size={36} />
            </div>
            <p className={styles.emptyTitle}>
              {searchQuery ? t('tasks.noMatch') : t('tasks.empty')}
            </p>
            {searchQuery ? (
              <SaoButton variant="default" onClick={() => setSearchQuery('')}>
                {t('tasks.clearFilter')}
              </SaoButton>
            ) : (
              <SaoButton variant="primary" onClick={openAddModal}>
                <Plus size={16} /> {t('tasks.addQuest')}
              </SaoButton>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <SaoTaskCard
              key={task._id}
              task={task}
              onToggle={toggleTask}
              onEdit={openEditModal}
              onDelete={confirmDelete}
            />
          ))
        )}
      </div>

      {/* ========================================================
         NÚT THÊM NHIỆM VỤ DẠNG ICON TRÒN NỔI BÊN DƯỚI (FAB)
         ======================================================== */}
      <SaoFab
        title={t('tasks.addQuest')}
        onClick={openAddModal}
        position="fixed"
      />

      {/* ========================================================
         4. MODAL: THÊM / SỬA NHIỆM VỤ
         ======================================================== */}
      <SaoModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? t('tasks.editQuest') : t('tasks.addQuest')}
        icon={editingTask ? <Edit2 size={20} /> : <Plus size={20} />}
      >
        <form onSubmit={handleSave} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>{t('tasks.taskName')}</label>
            <SaoInput
              type="text"
              placeholder={t('tasks.taskNamePlaceholder')}
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>{t('tasks.taskDesc')}</label>
            <SaoInput
              isTextarea
              placeholder={t('tasks.taskDescPlaceholder')}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>{t('tasks.rank')}</label>
            <SaoSelect
              options={TASK_RANK_OPTIONS}
              initialValue={formData.quest_rank}
              onChange={val => setFormData({...formData, quest_rank: val})}
            />
          </div>

          <div className={styles.dateTimeGrid}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel}>{t('tasks.dueDate')}</label>
              <SaoDatePicker 
                value={formData.due_date_date}
                onChange={(val) => setFormData({...formData, due_date_date: val})}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel}>{t('tasks.dueTime')}</label>
              <div className={styles.timeSelectorBox}>
                <div className={styles.timeSelectHalf}>
                  <SaoSelect 
                    options={Array.from({length: 24}, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))}
                    initialValue={formData.due_date_time.split(':')[0]}
                    onChange={(val) => setFormData({...formData, due_date_time: `${val}:${formData.due_date_time.split(':')[1]}`})}
                    allowCustom
                  />
                </div>
                <span className={styles.timeColon}>:</span>
                <div className={styles.timeSelectHalf}>
                  <SaoSelect 
                    options={Array.from({length: 12}, (_, i) => ({ value: (i*5).toString().padStart(2, '0'), label: (i*5).toString().padStart(2, '0') }))}
                    initialValue={formData.due_date_time.split(':')[1]}
                    onChange={(val) => setFormData({...formData, due_date_time: `${formData.due_date_time.split(':')[0]}:${val}`})}
                    allowCustom
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <SaoButton variant="default" onClick={closeModal} type="button" disabled={isSubmitting}>
              {t('common.cancel')}
            </SaoButton>
            <SaoButton variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : (editingTask ? t('common.save') : t('common.add'))}
            </SaoButton>
          </div>
        </form>
      </SaoModal>

      {/* ========================================================
         5. MODAL: XÁC NHẬN XÓA NHIỆM VỤ (CHUẨN SAOCONFIRMMODAL)
         ======================================================== */}
      <SaoConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDelete}
        message={t('tasks.deleteConfirm')}
      />
    </div>
  );
}
