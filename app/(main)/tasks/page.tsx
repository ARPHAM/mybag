"use client";

import { useState, useEffect } from 'react';
import { CheckSquare, Check, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import styles from './tasks.module.css';
import SaoModal from '../../components/SaoModal/SaoModal';
import { useSaoAlert } from '../../contexts/AlertContext';

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
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (res.ok) setTasks(data);
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
    due_date: ''
  });

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.reward?.leveledUp) {
          showAlert(`🎉 LEVEL UP! Bạn đã đạt Level ${data.reward.newLevel}`);
        } else if (data.penalty?.leveledDown) {
          showAlert(`⚠️ LEVEL DOWN! Exp bị trừ nên bạn bị rớt xuống Level ${data.penalty.newLevel}`);
        }
        window.dispatchEvent(new CustomEvent('sao-user-updated'));
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTaskToDelete(id);
  };

  const handleDelete = async () => {
    if (taskToDelete) {
      try {
        await fetch(`/api/tasks/${taskToDelete}`, { method: 'DELETE' });
        fetchTasks();
      } catch (err) {
        console.error(err);
      }
      setTaskToDelete(null);
    }
  };

  const openAddModal = () => {
    setEditingTask(null);
    setFormData({ title: '', description: '', quest_rank: 'C', due_date: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      quest_rank: task.quest_rank,
      due_date: new Date(task.due_date).toISOString().slice(0, 16)
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date) return;

    try {
      if (editingTask) {
        // For simplicity, we just use PUT to update the entire task or just assume creation for now.
        // If we want full edit, we'd need another API route update. Let's just reload.
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: formData.title, 
            description: formData.description,
            quest_rank: formData.quest_rank, 
            due_date: formData.due_date 
          }),
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
          <div style={{color: '#fff'}}>Đang kết nối hệ thống...</div>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className={`${styles.taskCard} ${task.status === 'COMPLETED' ? styles.completed : ''}`}
              onClick={() => toggleTask(task)}
            >
              <div className={styles.checkboxContainer}>
                <div className={styles.checkbox}>
                  {task.status === 'COMPLETED' && <Check size={16} className={styles.checkIcon} strokeWidth={3} />}
                </div>
              </div>

              <div className={styles.taskContent}>
                <div className={styles.taskName}>[{task.quest_rank}] {task.title}</div>
                <div className={styles.taskDesc}>
                  Hạn chót: {new Date(task.due_date).toLocaleString('vi-VN')}
                </div>
              </div>

              {/* Actions: Edit & Delete */}
              <div className={styles.taskActions}>
                <button
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={(e) => confirmDelete(e, task._id)}
                  title="Xóa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}

        <button className={styles.addButton} onClick={openAddModal}>
          <Plus size={20} /> Thêm nhiệm vụ mới
        </button>
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
            <input
              type="text"
              className={styles.input}
              placeholder="Vd: Chạy bộ 3km..."
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label>Mô tả chi tiết</label>
            <textarea
              className={styles.textarea}
              placeholder="Ghi chú thêm về nhiệm vụ này..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Độ khó (Rank)</label>
            <select
              className={styles.input}
              value={formData.quest_rank}
              onChange={e => setFormData({...formData, quest_rank: e.target.value})}
            >
              <option value="S">Rank S (Quan trọng bậc nhất - 1000 EXP)</option>
              <option value="A">Rank A (Rất khó - 600 EXP)</option>
              <option value="B">Rank B (Khó - 300 EXP)</option>
              <option value="C">Rank C (Trung bình - 150 EXP)</option>
              <option value="D">Rank D (Dễ/Nhanh - 50 EXP)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Hạn chót</label>
            <input
              type="datetime-local"
              className={styles.input}
              value={formData.due_date}
              onChange={e => setFormData({...formData, due_date: e.target.value})}
              required
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={`${styles.btn} ${styles.cancelBtn}`} onClick={closeModal}>
              Hủy bỏ
            </button>
            <button type="submit" className={`${styles.btn} ${styles.saveBtn}`}>
              {editingTask ? 'Cập nhật' : 'Tạo mới'}
            </button>
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
          <button type="button" className={`${styles.btn} ${styles.cancelBtn}`} onClick={() => setTaskToDelete(null)}>
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
