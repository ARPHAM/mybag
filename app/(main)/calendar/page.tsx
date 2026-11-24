'use client';

import React, { useState, useEffect } from 'react';
import DateSelector from './components/DateSelector';
import SAOTimeline from './components/SAOTimeline';
import SAOWeekView from './components/SAOWeekView';
import SAOMonthView from './components/SAOMonthView';
import SaoModal from '@/app/components/SaoModal/SaoModal';
import SaoSelect from '@/app/components/SaoSelect/SaoSelect';
import SaoDatePicker from '@/app/components/SaoDatePicker/SaoDatePicker';
import { Plus, Calendar, Edit2, Trash2, PauseCircle, Clock, Columns3, CalendarDays, Award, CheckCircle2, AlertTriangle } from 'lucide-react';
import styles from './calendar.module.css';
import { useSaoAlert } from '../../contexts/AlertContext';
import SaoButton from '@/app/components/SaoButton/SaoButton';
import SaoInput from '@/app/components/SaoInput/SaoInput';
import { getEvents, createEvent, updateEvent, deleteEvent } from './api';
import { getTasks } from '../tasks/api';
import { getLocalDateKey, isSameLocalDate } from './utils';
import { useI18n } from '@/lib/i18n';

const RANK_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: 'rgba(255, 215, 0, 0.2)', text: '#ffd700', border: '#ffd700' },
  A: { bg: 'rgba(255, 68, 68, 0.2)', text: '#ff4444', border: '#ff4444' },
  B: { bg: 'rgba(192, 132, 252, 0.2)', text: '#c084fc', border: '#c084fc' },
  C: { bg: 'rgba(56, 189, 248, 0.2)', text: '#38bdf8', border: '#38bdf8' },
  D: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8', border: '#94a3b8' }
};

export default function CalendarPage() {
  const { t, language } = useI18n();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [questTab, setQuestTab] = useState<'events' | 'quests'>('events');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const { showAlert } = useSaoAlert();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateStr, setStartDateStr] = useState(getLocalDateKey(new Date()));
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('10:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('WEEKLY');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDateStr, setRecurrenceEndDateStr] = useState<string>('');

  useEffect(() => {
    fetchEvents();
    const handleCalendarUpdate = () => {
      fetchEvents(true);
      fetchTasks(true);
    };
    window.addEventListener('sao-calendar-updated', handleCalendarUpdate);
    window.addEventListener('sao-tasks-updated', handleCalendarUpdate);
    return () => {
      window.removeEventListener('sao-calendar-updated', handleCalendarUpdate);
      window.removeEventListener('sao-tasks-updated', handleCalendarUpdate);
    };
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async (force = false) => {
    try {
      const data: any = await getTasks(force);
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks for calendar:", error);
    }
  };

  const fetchEvents = async (force = false) => {
    setLoading(true);
    try {
      let start: Date;
      let end: Date;

      if (viewMode === 'day') {
        start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
        end = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);
      } else if (viewMode === 'week') {
        const day = selectedDate.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + diffToMonday, 0, 0, 0, 0);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      } else if (viewMode === 'month') {
        // Bao trọn tháng kèm các ngày đệm phía trước và phía sau
        start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1 - 7, 0, 0, 0, 0);
        end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 7, 23, 59, 59, 999);
      } else {
        start = new Date(selectedDate);
        end = new Date(selectedDate);
      }

      const data: any = await getEvents(start.toISOString(), end.toISOString(), force);
      setEvents(data || []);
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
    setStartDateStr(getLocalDateKey(selectedDate));
    setStartTimeStr('09:00');
    setEndTimeStr('10:00');
    setIsRecurring(false);
    setRecurrenceType('WEEKLY');
    setRecurrenceDays([]);
    setRecurrenceEndDateStr('');
    setIsModalOpen(true);
  };

  const openEditModal = (ev: any) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setDescription(ev.description || '');
    
    const st = new Date(ev.start_time);
    const et = new Date(ev.end_time);
    
    setStartDateStr(getLocalDateKey(st));
    setStartTimeStr(`${st.getHours().toString().padStart(2, '0')}:${st.getMinutes().toString().padStart(2, '0')}`);
    setEndTimeStr(`${et.getHours().toString().padStart(2, '0')}:${et.getMinutes().toString().padStart(2, '0')}`);
    
    setIsRecurring(ev.is_recurring || false);
    setRecurrenceType(ev.recurrence_type || 'WEEKLY');
    setRecurrenceDays(ev.recurrence_days || []);
    setRecurrenceEndDateStr(ev.recurrence_end ? getLocalDateKey(ev.recurrence_end) : '');
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay, startH, startM, 0, 0);

    const [endH, endM] = endTimeStr.split(':').map(Number);
    const end = new Date(startYear, startMonth - 1, startDay, endH, endM, 0, 0);

    let recEndIso: string | undefined = undefined;
    if (isRecurring && recurrenceEndDateStr) {
      const [rY, rM, rD] = recurrenceEndDateStr.split('-').map(Number);
      const recEndDate = new Date(rY, rM - 1, rD, 23, 59, 59, 999);
      recEndIso = recEndDate.toISOString();
    }

    let finalRecurrenceDays = recurrenceDays;
    if (isRecurring && recurrenceType === 'WEEKLY' && (!recurrenceDays || recurrenceDays.length === 0)) {
      finalRecurrenceDays = [start.getDay()];
    }

    const payload = {
      title,
      description,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      color_code: '#f97316',
      is_recurring: isRecurring,
      recurrence_type: recurrenceType,
      recurrence_days: finalRecurrenceDays,
      recurrence_end: recEndIso
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

  // Filter items for selectedDate in Quest Log & Day view
  const selectedDateKey = getLocalDateKey(selectedDate);

  const dayEvents = events.filter(ev => {
    return getLocalDateKey(ev.start_time) === selectedDateKey;
  });

  const dayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return getLocalDateKey(t.due_date) === selectedDateKey;
  });


  return (
    <div className="p-1.5 lg:p-4 pb-16 lg:pb-4 flex flex-col font-mono h-full overflow-y-auto lg:overflow-hidden">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Calendar className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>{t('calendar.title')}</h1>
        </div>

        <div className="flex items-center gap-2 lg:gap-3 flex-wrap justify-end">
          {/* View Mode Toggle: Day / Week / Month */}
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded border border-cyan-500/30">
            <SaoButton
              variant={viewMode === 'day' ? 'primary' : 'ghost'}
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              onClick={() => setViewMode('day')}
            >
              <Clock size={13} style={{ marginRight: 4 }} /> {t('common.date')}
            </SaoButton>
            <SaoButton
              variant={viewMode === 'week' ? 'primary' : 'ghost'}
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              onClick={() => setViewMode('week')}
            >
              <Columns3 size={13} style={{ marginRight: 4 }} /> {t('calendar.weekView')}
            </SaoButton>
            <SaoButton
              variant={viewMode === 'month' ? 'primary' : 'ghost'}
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              onClick={() => setViewMode('month')}
            >
              <CalendarDays size={13} style={{ marginRight: 4 }} /> {t('calendar.monthView')}
            </SaoButton>
          </div>

          <SaoButton 
            onClick={openCreateModal}
            className={styles.addButton}
          >
            <Plus size={18} /> <span className="hidden sm:inline">{t('calendar.addEvent')}</span><span className="sm:hidden">{t('common.add')}</span>
          </SaoButton>
        </div>
      </div>

      {/* Date Selector Navigation Strip */}
      <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />

      {/* Main Layout Area */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 lg:gap-6 lg:flex-1 mt-2.5 lg:mt-4 lg:min-h-0">
        {/* Left 2 Cols: Main View (Timeline / Week / Month) */}
        <div className="h-[380px] sm:h-[460px] lg:h-auto lg:flex-1 shrink-0 lg:shrink lg:col-span-2 relative flex flex-col min-h-[320px] lg:min-h-0">
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm font-mono" style={{ color: 'var(--sao-primary-hex)' }}>
              Scanning data...
            </div>
          )}

          {viewMode === 'day' && (
            <SAOTimeline events={dayEvents} onEventClick={openEditModal} />
          )}

          {viewMode === 'week' && (
            <SAOWeekView
              selectedDate={selectedDate}
              events={events}
              tasks={tasks}
              onSelectDate={setSelectedDate}
              onEventClick={openEditModal}
            />
          )}

          {viewMode === 'month' && (
            <SAOMonthView
              selectedDate={selectedDate}
              events={events}
              tasks={tasks}
              onSelectDate={setSelectedDate}
              onEventClick={openEditModal}
              onSwitchToDayView={() => setViewMode('day')}
            />
          )}
        </div>

        {/* Right 1 Col: QUEST LOG with Events & Tasks Tabs */}
        <div className="min-h-[180px] max-h-[320px] shrink-0 lg:max-h-none lg:h-auto lg:shrink lg:col-span-1 flex flex-col bg-zinc-900/80 border border-zinc-700 p-3 sm:p-4 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden font-mono lg:min-h-0">
          <div className="flex items-center justify-between border-b pb-2 mb-3" style={{ borderColor: 'rgba(var(--sao-primary-rgb), 0.3)' }}>
            <h2 className="text-base font-bold" style={{ color: 'var(--sao-primary-hex)', textShadow: '0 0 5px rgba(var(--sao-primary-rgb), 0.8)' }}>
              QUEST LOG
            </h2>

            {/* Tab switch between Events and Quest Deadlines */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setQuestTab('events')}
                className={`px-2 py-0.5 rounded transition-all ${
                  questTab === 'events'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('calendar.eventsTab')} ({dayEvents.length})
              </button>
              <button
                onClick={() => setQuestTab('quests')}
                className={`px-2 py-0.5 rounded transition-all ${
                  questTab === 'quests'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('calendar.questsTab')} ({dayTasks.length})
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-3">
            {questTab === 'events' ? (
              dayEvents.length === 0 ? (
                <div className="text-zinc-500 italic text-sm py-4 text-center">{t('calendar.noEvents')}</div>
              ) : (
                dayEvents.map((ev, idx) => {
                  const actualColor = (ev.color_code && ev.color_code !== '#f97316') ? ev.color_code : null;
                  return (
                    <div 
                      key={ev._id || idx} 
                      onClick={() => openEditModal(ev)}
                      className="border-l-2 pl-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer" 
                      style={{ borderLeftColor: actualColor || 'var(--sao-primary-hex)' }}
                    >
                      <div className="font-bold text-sm text-zinc-200">{ev.title} {ev.is_virtual ? `(${t('calendar.recurring')})` : ''}</div>
                      {ev.description && <div className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap line-clamp-3 leading-relaxed">{ev.description}</div>}
                      <div className="text-xs text-[var(--sao-primary-hex)] mt-2 opacity-80 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(ev.start_time).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {hour: '2-digit', minute:'2-digit'})} - {new Date(ev.end_time).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              dayTasks.length === 0 ? (
                <div className="text-zinc-500 italic text-sm py-4 text-center">{t('calendar.noQuestsToday')}</div>
              ) : (
                dayTasks.map((task, idx) => {
                  const rank = task.quest_rank || 'C';
                  const rankBadge = RANK_BADGES[rank] || RANK_BADGES.C;
                  const isDone = task.status === 'COMPLETED';
                  const isOverdue = task.status === 'OVERDUE';

                  return (
                    <div
                      key={task._id || idx}
                      className="border pl-3 pr-2 py-2.5 bg-zinc-800/50 rounded-sm transition-all"
                      style={{ borderColor: rankBadge.border, boxShadow: `0 0 10px ${rankBadge.bg}` }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className="px-1.5 py-0.5 text-[10px] font-bold rounded"
                          style={{ backgroundColor: rankBadge.bg, color: rankBadge.text }}
                        >
                          RANK {rank}
                        </span>

                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isDone
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : isOverdue
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                              : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {isDone ? t('tasks.completed').toUpperCase() : isOverdue ? t('tasks.overdue').toUpperCase() : t('tasks.pending').toUpperCase()}
                        </span>
                      </div>

                      <div className="font-bold text-sm text-zinc-100">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{task.description}</div>
                      )}

                      <div className="text-xs text-amber-400 mt-2 flex items-center gap-1 opacity-90">
                        <Clock size={12} />
                        {new Date(task.due_date).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      </div>

      {/* Modal Edit / Create */}
      <SaoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingEvent ? t('calendar.eventDetails') : t('calendar.addEvent')}
        icon={editingEvent ? <Edit2 size={20} /> : <Plus size={20} />}
      >
        <form onSubmit={handleSaveEvent}>
          <div className={styles.formGroup}>
            <label>{t('calendar.eventTitle')}</label>
            <SaoInput 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              placeholder={t('calendar.eventTitlePlaceholder')}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>{t('calendar.eventDate')}</label>
            <SaoDatePicker 
              value={startDateStr}
              onChange={(val) => setStartDateStr(val)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t('calendar.eventDesc')}</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder={t('calendar.eventDescPlaceholder')}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>{t('calendar.startTime')}</label>
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
              <label>{t('calendar.endTime')}</label>
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
              {t('calendar.repeatEvent')}
            </div>

            {isRecurring && (
              <div className={styles.recurringBox}>
                <div className="flex flex-wrap gap-4 sm:gap-6 mb-3">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'DAILY'} onChange={() => setRecurrenceType('DAILY')} className="accent-orange-500 w-4 h-4"/>
                    {t('calendar.daily')}
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'WEEKLY'} onChange={() => setRecurrenceType('WEEKLY')} className="accent-orange-500 w-4 h-4"/>
                    {t('calendar.weekly')}
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'YEARLY'} onChange={() => setRecurrenceType('YEARLY')} className="accent-orange-500 w-4 h-4"/>
                    {t('calendar.yearly')}
                  </label>
                </div>

                {recurrenceType === 'WEEKLY' && (
                  <div className="flex flex-wrap gap-2 mt-3 mb-3">
                    {(language === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']).map((label, i) => (
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
                
                <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                  <label className={styles.formLabel}>{t('calendar.repeatUntilOptional')}</label>
                  <SaoDatePicker 
                    value={recurrenceEndDateStr} 
                    onChange={setRecurrenceEndDateStr} 
                    placeholder={t('calendar.unlimited')}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className={`${styles.modalFooter} ${editingEvent ? styles.spaceBetween : ''}`}>
            {editingEvent && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <SaoButton 
                  type="button"
                  onClick={() => handleDelete('series')}
                  className={`${styles.btn} ${styles.deleteBtnConfirm}`}
                >
                  <Trash2 size={16} /> {t('common.delete')}
                </SaoButton>
                {editingEvent.is_virtual && (
                  <SaoButton 
                    type="button"
                    onClick={() => handleDelete('exception')}
                    className={`${styles.btn} ${styles.pauseBtn}`}
                  >
                    <PauseCircle size={16} /> {t('calendar.skipToday')}
                  </SaoButton>
                )}
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto sm:ml-auto">
              <SaoButton 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`${styles.btn} ${styles.cancelBtn}`}
              >
                {t('common.cancel')}
              </SaoButton>
              <SaoButton 
                type="submit"
                className={`${styles.btn} ${styles.saveBtn}`}
              >
                {editingEvent ? t('common.save') : t('common.add')}
              </SaoButton>
            </div>
          </div>
        </form>
      </SaoModal>
    </div>
  );
}
