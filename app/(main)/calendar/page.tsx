'use client';

import React, { useState, useEffect } from 'react';
import DateSelector from './components/DateSelector';
import SAOTimeline from './components/SAOTimeline';
import SaoModal from '@/app/components/SaoModal/SaoModal';
import SaoSelect from '@/app/components/SaoSelect/SaoSelect';
import SaoDatePicker from '@/app/components/SaoDatePicker/SaoDatePicker';
import { Plus, Calendar, Edit2, Trash2, PauseCircle } from 'lucide-react';
import styles from './calendar.module.css';
import { useSaoAlert } from '../../contexts/AlertContext';
import SaoButton from '@/app/components/SaoButton/SaoButton';
import SaoInput from '@/app/components/SaoInput/SaoInput';
import { getEvents, createEvent, updateEvent, deleteEvent } from './api';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const { showAlert } = useSaoAlert();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateStr, setStartDateStr] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('10:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('WEEKLY');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate]);

  const fetchEvents = async (force = false) => {
    setLoading(true);
    try {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);

      const data: any = await getEvents(start.toISOString(), end.toISOString(), force);
      setEvents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setStartDateStr(new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setStartTimeStr('09:00');
    setEndTimeStr('10:00');
    setIsRecurring(false);
    setRecurrenceType('WEEKLY');
    setRecurrenceDays([]);
    setIsModalOpen(true);
  };

  const openEditModal = (ev: any) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setDescription(ev.description || '');
    
    const st = new Date(ev.start_time);
    const et = new Date(ev.end_time);
    
    setStartDateStr(new Date(st.getTime() - st.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setStartTimeStr(`${st.getHours().toString().padStart(2, '0')}:${st.getMinutes().toString().padStart(2, '0')}`);
    setEndTimeStr(`${et.getHours().toString().padStart(2, '0')}:${et.getMinutes().toString().padStart(2, '0')}`);
    
    setIsRecurring(ev.is_recurring || false);
    setRecurrenceType(ev.recurrence_type || 'WEEKLY');
    setRecurrenceDays(ev.recurrence_days || []);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(startDateStr);
    const [startH, startM] = startTimeStr.split(':');
    start.setHours(parseInt(startH), parseInt(startM), 0, 0);

    const end = new Date(startDateStr);
    const [endH, endM] = endTimeStr.split(':');
    end.setHours(parseInt(endH), parseInt(endM), 0, 0);

    const payload = {
      title,
      description,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      color_code: '#f97316',
      is_recurring: isRecurring,
      recurrence_type: recurrenceType,
      recurrence_days: recurrenceDays
    };

    try {
      if (editingEvent) {
        if (editingEvent.is_virtual) {
          await updateEvent(editingEvent.parent_event_id, {
            updateType: 'exception',
            exceptionDate: editingEvent.start_time,
            ...payload
          });
        } else {
          await updateEvent(editingEvent._id, {
            updateType: 'single',
            ...payload
          });
        }
      } else {
        await createEvent(payload);
      }

      showAlert(editingEvent ? 'Đã cập nhật sự kiện!' : 'Đã tạo sự kiện mới!');
      setIsModalOpen(false);
      fetchEvents(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (type: 'series' | 'exception') => {
    if (!editingEvent) return;
    
    try {
      const id = editingEvent.parent_event_id || editingEvent._id;
      const dateParam = type === 'exception' ? editingEvent.start_time : undefined;
      
      await deleteEvent(id, type, dateParam);

      showAlert(type === 'exception' ? 'Đã tạm nghỉ sự kiện này!' : 'Đã xóa sự kiện!');
      setIsModalOpen(false);
      fetchEvents(true);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleDay = (day: number) => {
    if (recurrenceDays.includes(day)) {
      setRecurrenceDays(recurrenceDays.filter(d => d !== day));
    } else {
      setRecurrenceDays([...recurrenceDays, day]);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col font-mono overflow-hidden">
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Calendar className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>Lịch trình</h1>
        </div>
        <SaoButton 
          onClick={openCreateModal}
          className={styles.addButton}
        >
          <Plus size={18} /> Thêm sự kiện
        </SaoButton>
      </div>

      <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 mt-4 min-h-0">
        <div className="lg:col-span-2 relative flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm font-mono" style={{ color: 'var(--sao-primary-hex)' }}>
              Scanning data...
            </div>
          )}
          <SAOTimeline events={events} onEventClick={openEditModal} />
        </div>

        <div className="lg:col-span-1 flex flex-col bg-zinc-900/80 border border-zinc-700 p-4 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden font-mono">
          <h2 className="text-lg font-bold border-b pb-2 mb-4" style={{ color: 'var(--sao-primary-hex)', borderColor: 'rgba(var(--sao-primary-rgb), 0.3)', textShadow: '0 0 5px rgba(var(--sao-primary-rgb), 0.8)' }}>
            QUEST LOG
          </h2>
          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-3">
            {events.length === 0 ? (
              <div className="text-zinc-500 italic text-sm">No active quests for this cycle.</div>
            ) : (
              events.map((ev, idx) => {
                const actualColor = (ev.color_code && ev.color_code !== '#f97316') ? ev.color_code : null;
                return (
                  <div 
                    key={ev._id || idx} 
                    onClick={() => openEditModal(ev)}
                    className="border-l-2 pl-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer" 
                    style={{ borderLeftColor: actualColor || 'var(--sao-primary-hex)' }}
                  >
                    <div className="font-bold text-sm text-zinc-200">{ev.title} {ev.is_virtual ? '(Lặp)' : ''}</div>
                    {ev.description && <div className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap line-clamp-3 leading-relaxed">{ev.description}</div>}
                    <div className="text-xs text-[var(--sao-primary-hex)] mt-2 opacity-80">
                      {new Date(ev.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - {new Date(ev.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Edit / Create */}
      <SaoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingEvent ? "Chi tiết sự kiện" : "Thêm lịch trình mới"}
        icon={editingEvent ? <Edit2 size={20} /> : <Plus size={20} />}
      >
        <form onSubmit={handleSaveEvent}>
          <div className={styles.formGroup}>
            <label>Tiêu đề</label>
            <SaoInput 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              placeholder="VD: Họp định kỳ, Thể dục..."
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Ngày diễn ra</label>
            <SaoDatePicker 
              value={startDateStr}
              onChange={(val) => setStartDateStr(val)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Mô tả chi tiết</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="Ghi chú thêm..."
            />
          </div>
          
          <div className="flex gap-4">
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>Giờ bắt đầu</label>
              <div className="flex items-center gap-2 bg-black/30 border border-zinc-700/50 p-1 rounded">
                <div className="flex-1">
                  <SaoSelect 
                    options={Array.from({length: 24}, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))}
                    initialValue={startTimeStr.split(':')[0]}
                    onChange={(val) => setStartTimeStr(`${val}:${startTimeStr.split(':')[1]}`)}
                    allowCustom
                  />
                </div>
                <span className="text-zinc-400 font-bold">:</span>
                <div className="flex-1">
                  <SaoSelect 
                    options={Array.from({length: 12}, (_, i) => ({ value: (i*5).toString().padStart(2, '0'), label: (i*5).toString().padStart(2, '0') }))}
                    initialValue={startTimeStr.split(':')[1]}
                    onChange={(val) => setStartTimeStr(`${startTimeStr.split(':')[0]}:${val}`)}
                    allowCustom
                  />
                </div>
              </div>
            </div>
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>Giờ kết thúc</label>
              <div className="flex items-center gap-2 bg-black/30 border border-zinc-700/50 p-1 rounded">
                <div className="flex-1">
                  <SaoSelect 
                    options={Array.from({length: 24}, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))}
                    initialValue={endTimeStr.split(':')[0]}
                    onChange={(val) => setEndTimeStr(`${val}:${endTimeStr.split(':')[1]}`)}
                    allowCustom
                  />
                </div>
                <span className="text-zinc-400 font-bold">:</span>
                <div className="flex-1">
                  <SaoSelect 
                    options={Array.from({length: 12}, (_, i) => ({ value: (i*5).toString().padStart(2, '0'), label: (i*5).toString().padStart(2, '0') }))}
                    initialValue={endTimeStr.split(':')[1]}
                    onChange={(val) => setEndTimeStr(`${endTimeStr.split(':')[0]}:${val}`)}
                    allowCustom
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-700/30">
            <div 
              className={styles.checkboxContainer}
              onClick={() => setIsRecurring(!isRecurring)}
            >
              <div className={`${styles.checkbox} ${isRecurring ? styles.checked : ''}`}>
                {isRecurring && <div style={{width: 10, height: 10, background: 'var(--sao-primary-hex)', borderRadius: 2}} />}
              </div>
              Lặp lại sự kiện này (Recurring)
            </div>

            {isRecurring && (
              <div className={styles.recurringBox}>
                <div className="flex gap-6 mb-3">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'DAILY'} onChange={() => setRecurrenceType('DAILY')} className="accent-orange-500 w-4 h-4"/>
                    Hàng ngày
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'WEEKLY'} onChange={() => setRecurrenceType('WEEKLY')} className="accent-orange-500 w-4 h-4"/>
                    Hàng tuần
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'YEARLY'} onChange={() => setRecurrenceType('YEARLY')} className="accent-orange-500 w-4 h-4"/>
                    Hàng năm
                  </label>
                </div>

                {recurrenceType === 'WEEKLY' && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label, i) => (
                      <div 
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={`${styles.dayBtn} ${recurrenceDays.includes(i) ? styles.selected : ''}`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className={`${styles.modalFooter} ${editingEvent ? styles.spaceBetween : ''}`}>
            {editingEvent && (
              <div className="flex gap-2">
                <SaoButton 
                  type="button"
                  onClick={() => handleDelete('series')}
                  className={`${styles.btn} ${styles.deleteBtnConfirm}`}
                >
                  <Trash2 size={16} /> Xóa
                </SaoButton>
                {editingEvent.is_virtual && (
                  <SaoButton 
                    type="button"
                    onClick={() => handleDelete('exception')}
                    className={`${styles.btn} ${styles.pauseBtn}`}
                  >
                    <PauseCircle size={16} /> Bỏ qua hôm nay
                  </SaoButton>
                )}
              </div>
            )}
            
            <div className="flex gap-3" style={!editingEvent ? {marginLeft: 'auto'} : {}}>
              <SaoButton 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`${styles.btn} ${styles.cancelBtn}`}
              >
                Hủy bỏ
              </SaoButton>
              <SaoButton 
                type="submit"
                className={`${styles.btn} ${styles.saveBtn}`}
              >
                {editingEvent ? 'Cập nhật' : 'Tạo mới'}
              </SaoButton>
            </div>
          </div>
        </form>
      </SaoModal>
    </div>
  );
}
