"use client";

import { useState, useEffect } from 'react';
import { CheckSquare, Check, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import styles from './tasks.module.css';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoLoading from '../../components/SaoLoading/SaoLoading';
import SaoDatePicker from '../../components/SaoDatePicker/SaoDatePicker';
import SaoSelect from '../../components/SaoSelect/SaoSelect';
import SaoInput from '../../components/SaoInput/SaoInput';
import SaoButton from '../../components/SaoButton/SaoButton';
import { useSaoAlert } from '../../contexts/AlertContext';
import { getTasks, createTask, updateTask, deleteTask } from './api';

interface Task {
  _id: string;
  title: string;
  description?: string;
  quest_rank: string;
  status: string;
  due_date: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert } = useSaoAlert();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data: any = await getTasks();
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
          showAlert(`🎉 LEVEL UP! Bạn đã đạt Level ${data.reward.newLevel}`);
        } else if (data.penalty?.leveledDown) {
          showAlert(`⚠️ LEVEL DOWN! Exp bị trừ nên bạn bị rớt xuống Level ${data.penalty.newLevel}`);
        }
        window.dispatchEvent(new CustomEvent('sao-user-updated'));
        fetchTasks();
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
        fetchTasks();
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
      due_date_date: new Date().toISOString().split('T')[0],
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
    const finalDueDate = `${formData.due_date_date}T${formData.due_date_time}`;
    if (!formData.title.trim() || !formData.due_date_date) return;

    try {
      if (editingTask) {
        // For simplicity, we just use PUT to update the entire task or just assume creation for now.
        // If we want full edit, we'd need another API route update. Let's just reload.
      } else {
        await createTask({ 
          title: formData.title, 
          description: formData.description,
          quest_rank: formData.quest_rank, 
          due_date: finalDueDate 
        });
      }
      fetchTasks();
    } catch (err) {
      console.error(err);
    }

    closeModal();
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
          <h1 className={styles.title}>Nhật ký Nhiệm vụ</h1>
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
                  {task.status === 'OVERDUE' && <span className="text-red-500 font-bold leading-none">X</span>}
                </div>
              </div>

              <div className={styles.taskContent}>
                <div className={`${styles.taskName} ${task.status === 'OVERDUE' ? 'text-red-400 line-through opacity-70' : ''}`}>[{task.quest_rank}] {task.title}</div>
                <div className={`${styles.taskDesc} ${task.status === 'OVERDUE' ? 'text-red-500/70' : ''}`}>
                  Hạn chót: {new Date(task.due_date).toLocaleString('vi-VN')} {task.status === 'OVERDUE' ? '(QUÁ HẠN)' : ''}
                </div>
              </div>

              {/* Actions: Edit & Delete */}
              <div className={styles.taskActions}>
                <SaoButton
                  variant="ghost"
                  ghostType="danger"
                  onClick={(e) => confirmDelete(e, task._id)}
                  title="Xóa"
                >
                  <Trash2 size={16} />
                </SaoButton>
              </div>
            </div>
          ))
        )}

        <SaoButton variant="dashed" onClick={openAddModal}>
          <Plus size={20} /> Thêm nhiệm vụ mới
        </SaoButton>
      </div>

      {/* MODAL: THÊM / SỬA */}
      <SaoModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? 'Chỉnh sửa nhiệm vụ' : 'Tạo nhiệm vụ mới'}
        icon={editingTask ? <Edit2 size={20} /> : <Plus size={20} />}
      >
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label>Tên nhiệm vụ</label>
            <SaoInput
              type="text"
              placeholder="Vd: Chạy bộ 3km..."
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label>Mô tả chi tiết</label>
            <SaoInput
              isTextarea
              placeholder="Ghi chú thêm về nhiệm vụ này..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Độ khó (Rank)</label>
            <SaoSelect
              options={[
                { value: "S", label: "Rank S (Quan trọng bậc nhất - 1000 EXP)" },
                { value: "A", label: "Rank A (Rất khó - 600 EXP)" },
                { value: "B", label: "Rank B (Khó - 300 EXP)" },
                { value: "C", label: "Rank C (Trung bình - 150 EXP)" },
                { value: "D", label: "Rank D (Dễ/Nhanh - 50 EXP)" }
              ]}
              initialValue={formData.quest_rank}
              onChange={val => setFormData({...formData, quest_rank: val})}
            />
          </div>

          <div className="flex gap-4">
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>Ngày hạn chót</label>
              <SaoDatePicker 
                value={formData.due_date_date}
                onChange={(val) => setFormData({...formData, due_date_date: val})}
                required
              />
            </div>

            <div className={styles.formGroup} style={{flex: 1}}>
              <label>Giờ hạn chót</label>
              <div className="flex items-center gap-2 bg-black/30 border border-zinc-700/50 p-1 rounded font-mono text-sm">
                <div className="flex-1">
                  <SaoSelect 
                    options={Array.from({length: 24}, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))}
                    initialValue={formData.due_date_time.split(':')[0] || '23'}
                    onChange={(val) => setFormData({...formData, due_date_time: `${val}:${formData.due_date_time.split(':')[1] || '59'}`})}
                    allowCustom
                  />
                </div>
                <span className="text-zinc-400 font-bold">:</span>
                <div className="flex-1">
                  <SaoSelect 
                    options={Array.from({length: 12}, (_, i) => ({ value: (i*5).toString().padStart(2, '0'), label: (i*5).toString().padStart(2, '0') }))}
                    initialValue={formData.due_date_time.split(':')[1] || '59'}
                    onChange={(val) => setFormData({...formData, due_date_time: `${formData.due_date_time.split(':')[0] || '23'}:${val}`})}
                    allowCustom
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <SaoButton variant="default" onClick={closeModal} type="button">
              Hủy
            </SaoButton>
            <SaoButton variant="primary" type="submit">
              {editingTask ? 'Cập nhật' : 'Tạo mới'}
            </SaoButton>
          </div>
        </form>
      </SaoModal>

      {/* MODAL: XÁC NHẬN XÓA */}
      <SaoModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        title="Xác nhận xóa"
        icon={<AlertTriangle size={20} />}
      >
        <div className={styles.confirmText}>
          Bạn có chắc chắn muốn xóa nhiệm vụ này không? Hành động này không thể hoàn tác.
        </div>
        <div className={styles.modalFooter}>
          <SaoButton variant="default" onClick={() => setTaskToDelete(null)} type="button">
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
