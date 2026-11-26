'use client';

import React, { useState, useEffect } from 'react';
import DateSelector from '@/app/components/calendar/DateSelector';
import SAOTimeline from '@/app/components/calendar/SAOTimeline';
import SAOWeekView from '@/app/components/calendar/SAOWeekView';
import SAOMonthView from '@/app/components/calendar/SAOMonthView';
import SaoModal from '@/app/components/SaoModal';
import SaoSelect from '@/app/components/SaoSelect';
import SaoDatePicker from '@/app/components/SaoDatePicker';
import SaoPanel from '@/app/components/SaoPanel';
import SaoLoading from '@/app/components/SaoLoading';
import SaoFab from '@/app/components/SaoFab';
import SaoConfirmModal from '@/app/components/SaoConfirmModal';
import CalendarEventCard from '@/app/components/calendar/CalendarEventCard';
import CalendarQuestCard from '@/app/components/calendar/CalendarQuestCard';
import { Plus, Calendar, Edit2, Trash2, PauseCircle, Clock, Columns3, CalendarDays, Award, CheckCircle2, AlertTriangle } from 'lucide-react';
import styles from './calendar.module.css';
import { useSaoAlert } from '../../contexts/AlertContext';
import SaoButton from '@/app/components/SaoButton';
import SaoInput from '@/app/components/SaoInput';
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
  const [mobileDaySubTab, setMobileDaySubTab] = useState<'timeline' | 'list'>('timeline');
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

  const currentRangeKeyRef = React.useRef<string>('');

  const getCalendarRange = (date: Date, mode: 'day' | 'week' | 'month') => {
    let start: Date;
    let end: Date;

    if (mode === 'day') {
      start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    } else if (mode === 'week') {
      const day = date.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday, 0, 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    } else if (mode === 'month') {
      // Bao trọn tháng kèm các ngày đệm phía trước và phía sau
      start = new Date(date.getFullYear(), date.getMonth(), 1 - 7, 0, 0, 0, 0);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 7, 23, 59, 59, 999);
    } else {
      start = new Date(date);
      end = new Date(date);
    }
    return { start, end };
  };

  const fetchEvents = async (force = false) => {
    const { start, end } = getCalendarRange(selectedDate, viewMode);
    const rangeKey = `${viewMode}_${start.toISOString()}_${end.toISOString()}`;

    // Nếu khoảng thời gian hiển thị (Tuần/Tháng) không hề thay đổi và không ép buộc làm mới (force),
    // không kích hoạt loading hay gọi API lại để tránh làm chớp giật/reload lại giao diện!
    if (!force && rangeKey === currentRangeKeyRef.current) {
      return;
    }

    currentRangeKeyRef.current = rangeKey;
    setLoading(true);
    try {
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

  const [eventToDelete, setEventToDelete] = useState<{ id: string; type: 'series' | 'exception'; dateParam?: string } | null>(null);

  const requestDelete = (type: 'series' | 'exception') => {
    if (!editingEvent) return;
    const id = editingEvent.parent_event_id || editingEvent._id;
    const dateParam = type === 'exception' ? editingEvent.start_time : undefined;
    setEventToDelete({ id, type, dateParam });
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      await deleteEvent(eventToDelete.id, eventToDelete.type, eventToDelete.dateParam);
      showAlert(eventToDelete.type === 'exception' ? 'Đã tạm nghỉ sự kiện này!' : 'Đã xóa sự kiện!');
      setEventToDelete(null);
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

  const selectedDateKey = getLocalDateKey(selectedDate);

  const dayEvents = events.filter(ev => {
    return getLocalDateKey(ev.start_time) === selectedDateKey;
  });

  const dayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return getLocalDateKey(t.due_date) === selectedDateKey;
  });


  return (
    <div className="flex flex-col font-mono h-full w-full overflow-hidden">
      <DateSelector
        selectedDate={selectedDate}
        onChange={setSelectedDate}
        viewMode={viewMode}
        className="mb-2 lg:mb-3 shrink-0"
      />

      <SaoPanel
        title={t('calendar.title')}
        icon={<Calendar size={20} className="text-[var(--sao-primary-hex,#00f0ff)]" />}
        headerActions={
          <div className={styles.viewModeGroup}>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === 'day' ? styles.active : ''}`}
              onClick={() => setViewMode('day')}
            >
              <Clock size={12} /> <span>{t('common.date')}</span>
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              <Columns3 size={12} /> <span>{t('calendar.weekView')}</span>
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              <CalendarDays size={12} /> <span>{t('calendar.monthView')}</span>
            </button>
          </div>
        }
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <SaoLoading text="SCANNING TIMELINE..." />
          </div>
        )}

        {viewMode === 'day' && (
          <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 overflow-hidden">
            {/* Bộ chuyển đổi Biểu đồ 24h vs Danh sách sự kiện dành riêng cho Mobile */}
            <div className="flex lg:hidden items-center p-1 bg-black/40 border border-[rgba(var(--sao-primary-rgb),0.3)] rounded-sm shrink-0 gap-1">
              <button
                type="button"
                className={`flex-1 py-1 px-2 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                  mobileDaySubTab === 'timeline'
                    ? 'bg-[var(--sao-primary-hex,#00f0ff)] text-black shadow-[0_0_10px_var(--sao-primary-hex,#00f0ff)]'
                    : 'text-[#8ab4f8] hover:text-white'
                }`}
                onClick={() => setMobileDaySubTab('timeline')}
              >
                <Clock size={13} />
                <span>{t('calendar.timelineView') || 'Dòng thời gian'}</span>
              </button>
              <button
                type="button"
                className={`flex-1 py-1 px-2 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                  mobileDaySubTab === 'list'
                    ? 'bg-[var(--sao-primary-hex,#00f0ff)] text-black shadow-[0_0_10px_var(--sao-primary-hex,#00f0ff)]'
                    : 'text-[#8ab4f8] hover:text-white'
                }`}
                onClick={() => setMobileDaySubTab('list')}
              >
                <Award size={13} />
                <span>{t('calendar.eventsTab')} ({dayEvents.length})</span>
              </button>
            </div>

            {/* Cột trái (Timeline): 8/12 cột (~67%) trên desktop, full height khi chọn timeline trên mobile */}
            <div className={`${mobileDaySubTab === 'timeline' ? 'flex-1 min-h-[380px] flex' : 'hidden'} lg:flex lg:h-full lg:col-span-8 min-h-0 flex-col shrink-0 lg:shrink`}>
              <SAOTimeline
                events={dayEvents}
                selectedDate={selectedDate}
                onEventClick={openEditModal}
              />
            </div>

            {/* Cột phải (Quest Log HUD Card): 4/12 cột (~33%) trên desktop, full height khi chọn list trên mobile */}
            <div className={`${mobileDaySubTab === 'list' ? 'flex-1 min-h-[340px] flex' : 'hidden'} lg:flex lg:max-h-none lg:h-full lg:col-span-4 min-h-0 flex-col shrink-0 lg:shrink`}>
              <div className={styles.questLogCard}>
                <span className={styles.questLogBevelTL} aria-hidden="true" />
                <span className={styles.questLogDiamondTL} aria-hidden="true" />
                <span className={styles.questLogBevelBR} aria-hidden="true" />
                <span className={styles.questLogDiamondBR} aria-hidden="true" />

                <div className={styles.questLogHeader}>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-wider">
                    <Award size={15} className="text-[var(--sao-primary-hex,#00f0ff)]" />
                    <span>{t('calendar.questLog')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <SaoButton
                      variant={questTab === 'events' ? 'primary' : 'ghost'}
                      active={questTab === 'events'}
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      onClick={() => setQuestTab('events')}
                    >
                      {t('calendar.eventsTab')} ({dayEvents.length})
                    </SaoButton>
                    <SaoButton
                      variant={questTab === 'quests' ? 'primary' : 'ghost'}
                      active={questTab === 'quests'}
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      onClick={() => setQuestTab('quests')}
                    >
                      {t('calendar.questsTab')} ({dayTasks.length})
                    </SaoButton>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar space-y-2 mt-2">
                  {questTab === 'events' ? (
                    dayEvents.length === 0 ? (
                      <div className="text-zinc-500 italic text-xs py-8 text-center">{t('calendar.noEvents')}</div>
                    ) : (
                      dayEvents.map((ev, idx) => (
                        <CalendarEventCard
                          key={ev._id || idx}
                          event={ev}
                          onClick={openEditModal}
                        />
                      ))
                    )
                  ) : (
                    dayTasks.length === 0 ? (
                      <div className="text-zinc-500 italic text-xs py-8 text-center">{t('calendar.noQuestsToday')}</div>
                    ) : (
                      dayTasks.map((task, idx) => (
                        <CalendarQuestCard
                          key={task._id || idx}
                          task={task}
                        />
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="flex-1 min-h-0 h-full overflow-hidden">
            <SAOWeekView
              selectedDate={selectedDate}
              events={events}
              tasks={tasks}
              onSelectDate={setSelectedDate}
              onEventClick={openEditModal}
            />
          </div>
        )}

        {viewMode === 'month' && (
          <div className="flex-1 min-h-0 h-full overflow-hidden">
            <SAOMonthView
              selectedDate={selectedDate}
              events={events}
              tasks={tasks}
              onSelectDate={setSelectedDate}
              onEventClick={openEditModal}
              onSwitchToDayView={() => setViewMode('day')}
            />
          </div>
        )}
      </SaoPanel>

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
            <SaoInput
              isTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('calendar.eventDescPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>{t('calendar.startTime')}</label>
              <div className="flex items-center gap-2 bg-black/30 border border-zinc-700/50 p-1 rounded">
                <div className="flex-1">
                  <SaoSelect
                    options={Array.from({ length: 24 }, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))}
                    initialValue={startTimeStr.split(':')[0]}
                    onChange={(val) => setStartTimeStr(`${val}:${startTimeStr.split(':')[1]}`)}
                    allowCustom
                  />
                </div>
                <span className="text-zinc-400 font-bold">:</span>
                <div className="flex-1">
                  <SaoSelect
                    options={Array.from({ length: 12 }, (_, i) => ({ value: (i * 5).toString().padStart(2, '0'), label: (i * 5).toString().padStart(2, '0') }))}
                    initialValue={startTimeStr.split(':')[1]}
                    onChange={(val) => setStartTimeStr(`${startTimeStr.split(':')[0]}:${val}`)}
                    allowCustom
                  />
                </div>
              </div>
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>{t('calendar.endTime')}</label>
              <div className="flex items-center gap-2 bg-black/30 border border-zinc-700/50 p-1 rounded">
                <div className="flex-1">
                  <SaoSelect
                    options={Array.from({ length: 24 }, (_, i) => ({ value: i.toString().padStart(2, '0'), label: i.toString().padStart(2, '0') }))}
                    initialValue={endTimeStr.split(':')[0]}
                    onChange={(val) => setEndTimeStr(`${val}:${endTimeStr.split(':')[1]}`)}
                    allowCustom
                  />
                </div>
                <span className="text-zinc-400 font-bold">:</span>
                <div className="flex-1">
                  <SaoSelect
                    options={Array.from({ length: 12 }, (_, i) => ({ value: (i * 5).toString().padStart(2, '0'), label: (i * 5).toString().padStart(2, '0') }))}
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
                {isRecurring && <div style={{ width: 10, height: 10, background: 'var(--sao-primary-hex)', borderRadius: 2 }} />}
              </div>
              {t('calendar.repeatEvent')}
            </div>

            {isRecurring && (
              <div className={styles.recurringBox}>
                <div className="flex flex-wrap gap-4 sm:gap-6 mb-3">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'DAILY'} onChange={() => setRecurrenceType('DAILY')} className="accent-orange-500 w-4 h-4" />
                    {t('calendar.daily')}
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'WEEKLY'} onChange={() => setRecurrenceType('WEEKLY')} className="accent-orange-500 w-4 h-4" />
                    {t('calendar.weekly')}
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input type="radio" name="recType" checked={recurrenceType === 'YEARLY'} onChange={() => setRecurrenceType('YEARLY')} className="accent-orange-500 w-4 h-4" />
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
                  variant="danger"
                  onClick={() => requestDelete('series')}
                >
                  <Trash2 size={16} /> {t('common.delete')}
                </SaoButton>
                {editingEvent.is_virtual && (
                  <SaoButton
                    type="button"
                    variant="default"
                    className={styles.pauseBtn}
                    onClick={() => requestDelete('exception')}
                  >
                    <PauseCircle size={16} /> {t('calendar.skipToday')}
                  </SaoButton>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto sm:ml-auto">
              <SaoButton
                type="button"
                variant="default"
                onClick={() => setIsModalOpen(false)}
              >
                {t('common.cancel')}
              </SaoButton>
              <SaoButton
                type="submit"
                variant="primary"
              >
                {editingEvent ? t('common.save') : t('common.add')}
              </SaoButton>
            </div>
          </div>
        </form>
      </SaoModal>

      {/* Modal xác nhận cảnh báo xóa / tạm nghỉ sự kiện */}
      <SaoConfirmModal
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={confirmDelete}
        title={eventToDelete?.type === 'exception' ? t('calendar.skipToday') : t('common.delete')}
        confirmVariant={eventToDelete?.type === 'exception' ? 'default' : 'danger'}
        message={
          eventToDelete?.type === 'exception'
            ? 'Tạm nghỉ sự kiện này trong hôm nay?'
            : (t('calendar.deleteConfirm') || 'Bạn có chắc chắn muốn xóa sự kiện này vĩnh viễn?')
        }
      />

      {/* Nút thêm sự kiện nổi chuẩn SAO FAB */}
      <SaoFab
        title={t('calendar.addEvent')}
        onClick={openCreateModal}
        position="fixed"
      />
    </div>
  );
}
