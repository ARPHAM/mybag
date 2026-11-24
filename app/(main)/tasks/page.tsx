"use client";

import { useState, useEffect } from 'react';
import { CheckSquare, Check, Plus, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import styles from './tasks.module.css';
import SaoModal from '@/app/components/SaoModal';
import SaoLoading from '@/app/components/SaoLoading';
import SaoDatePicker from '@/app/components/SaoDatePicker';
import SaoSelect from '@/app/components/SaoSelect';
import SaoInput from '@/app/components/SaoInput';
import SaoButton from '@/app/components/SaoButton';
import { useSaoAlert } from '../../contexts/AlertContext';
import { useI18n } from '../../contexts/I18nContext';
import { getTasks, createTask, updateTask, deleteTask } from './api';

import { Task } from '@/lib/types';
import { TASK_RANK_OPTIONS } from '@/lib/constants';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
    const tzOffset = dueDateObj.getTimezoneOffset() * 60000; // offset in ms
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

    // Parse using local timezone correctly
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

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  return (
    <div className={styles.tasksContainer}>
      {/* HEADER SECTION */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <CheckSquare className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>{t('tasks.title')}</h1>
        </div>

        <div className={styles.progressSection}>
          <span className={styles.progressText}>
            {t('tasks.progress')}: {completedCount}/{totalCount}
          </span>
          <div className={styles.progressBarWrapper}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* TASK LIST */}
      <div className={styles.taskList}>
        {isLoading ? (
          <SaoLoading fullPage />
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className={`${styles.taskCard} ${task.status === 'COMPLETED' ? styles.completed : ''}`}
              onClick={() => toggleTask(task)}
            >
              <div className={styles.checkboxContainer}>
                <div className={`${styles.checkbox} ${task.status === 'OVERDUE' ? styles.failedCheckbox : ''}`}>
                  {task.status === 'COMPLETED' && <Check size={16} className={styles.checkIcon} strokeWidth={3} />}
                  {task.status === 'OVERDUE' && <X size={15} className="text-red-500" strokeWidth={3} />}
                </div>
              </div>

              <div className={styles.taskContent}>
                <div className={`${styles.taskName} ${task.status === 'OVERDUE' ? 'text-red-400 line-through opacity-70' : ''}`}>[{task.quest_rank}] {task.title}</div>
                <div className={`${styles.taskDesc} ${task.status === 'OVERDUE' ? 'text-red-500/70' : ''}`}>
                  {t('tasks.deadline')}: {new Date(task.due_date).toLocaleString('vi-VN')} {task.status === 'OVERDUE' ? `(${t('tasks.overdue').toUpperCase()})` : ''}
                </div>
              </div>

              {/* Actions: Edit & Delete */}
              <div className={styles.taskActions}>
                <SaoButton
                  variant="ghost"
                  onClick={(e) => openEditModal(e, task)}
                  title={t('common.edit')}
                >
                  <Edit2 size={16} />
                </SaoButton>
                <SaoButton
                  variant="ghost"
                  ghostType="danger"
                  onClick={(e) => confirmDelete(e, task._id)}
                  title={t('common.delete')}
                >
                  <Trash2 size={16} />
                </SaoButton>
              </div>
            </div>
          ))
        )}

        <SaoButton variant="dashed" onClick={openAddModal}>
          <Plus size={20} /> {t('tasks.addQuest')}
        </SaoButton>
      </div>

      {/* MODAL: THÊM / SỬA */}
      <SaoModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? t('tasks.editQuest') : t('tasks.addQuest')}
        icon={editingTask ? <Edit2 size={20} /> : <Plus size={20} />}
      >
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label>{t('tasks.taskName')}</label>
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
            <label>{t('tasks.taskDesc')}</label>
            <SaoInput
              isTextarea
              placeholder={t('tasks.taskDescPlaceholder')}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t('tasks.rank')}</label>
            <SaoSelect
              options={TASK_RANK_OPTIONS}
              initialValue={formData.quest_rank}
              onChange={val => setFormData({...formData, quest_rank: val})}
            />
          </div>

          <div className="flex gap-4">
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>{t('tasks.dueDate')}</label>
              <SaoDatePicker 
                value={formData.due_date_date}
                onChange={(val) => setFormData({...formData, due_date_date: val})}
                required
              />
            </div>

            <div className={styles.formGroup} style={{flex: 1}}>
              <label>{t('tasks.dueTime')}</label>
              <div className="flex items-center gap-2 font-mono text-sm">
                <div className="flex-1">
                  <SaoSelect 
                    options={Array.from({length: 24}, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))}
                    initialValue={formData.due_date_time.split(':')[0]}
                    onChange={(val) => setFormData({...formData, due_date_time: `${val}:${formData.due_date_time.split(':')[1]}`})}
                    allowCustom
                  />
                </div>
                <span className="text-zinc-400 font-bold">:</span>
                <div className="flex-1">
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

      {/* MODAL: XÁC NHẬN XÓA */}
      <SaoModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        title={t('common.delete')}
        icon={<AlertTriangle size={20} />}
      >
        <div className={styles.confirmText}>
          {t('tasks.deleteConfirm')}
        </div>
        <div className={styles.modalFooter}>
          <SaoButton variant="default" onClick={() => setTaskToDelete(null)} type="button">
            {t('common.cancel')}
          </SaoButton>
          <SaoButton variant="danger" onClick={handleDelete} type="button">
            <Trash2 size={16} /> {t('common.delete')}
          </SaoButton>
        </div>
      </SaoModal>
    </div>
  );
}
