"use client";

import { useState } from 'react';
import { CheckSquare, Check, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import styles from './tasks.module.css';
import SaoModal from '../../components/SaoModal/SaoModal';

interface Task {
  id: string;
  name: string;
  description: string;
  completed: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      name: 'Uống đủ 2L nước',
      description: 'Duy trì thanh lọc cơ thể',
      completed: false,
    },
    {
      id: '2',
      name: 'Tập thể dục 30 phút',
      description: 'Chạy bộ hoặc workout tại nhà',
      completed: true,
    },
    {
      id: '3',
      name: 'Đọc 1 chương sách mới',
      description: 'Nâng cấp tư duy và kiến thức',
      completed: false,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTaskToDelete(id);
  };

  const handleDelete = () => {
    if (taskToDelete) {
      setTasks(tasks.filter(t => t.id !== taskToDelete));
      setTaskToDelete(null);
    }
  };

  const openAddModal = () => {
    setEditingTask(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    if (editingTask) {
      setTasks(tasks.map(t => 
        t.id === editingTask.id 
          ? { ...t, ...formData } 
          : t
      ));
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        completed: false
      };
      setTasks([...tasks, newTask]);
    }
    
    closeModal();
  };

  const completedCount = tasks.filter(t => t.completed).length;
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
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={`${styles.taskCard} ${task.completed ? styles.completed : ''}`}
            onClick={() => toggleTask(task.id)}
          >
            <div className={styles.checkboxContainer}>
              <div className={styles.checkbox}>
                <Check size={16} className={styles.checkIcon} strokeWidth={3} />
              </div>
            </div>

            <div className={styles.taskContent}>
              <div className={styles.taskName}>{task.name}</div>
              <div className={styles.taskDesc}>{task.description}</div>
            </div>

            {/* Actions: Edit & Delete */}
            <div className={styles.taskActions}>
              <button 
                className={styles.actionBtn} 
                onClick={(e) => openEditModal(e, task)}
                title="Chỉnh sửa"
              >
                <Edit2 size={16} />
              </button>
              <button 
                className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                onClick={(e) => confirmDelete(e, task.id)}
                title="Xóa"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

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
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
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
