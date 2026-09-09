"use client";

import { useState, useMemo } from 'react';
import { Activity, Edit2, Plus, Scale, Ruler } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import styles from './health.module.css';
import SaoModal from '../../components/SaoModal/SaoModal';

interface WeightEntry {
  date: string;
  weight: number;
}

export default function HealthPage() {
  const [height, setHeight] = useState<number>(170); // cm
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([
    { date: '01/09', weight: 65.2 },
    { date: '03/09', weight: 65.0 },
    { date: '05/09', weight: 64.8 },
    { date: '07/09', weight: 64.9 },
    { date: '09/09', weight: 64.5 },
  ]);

  // Modals state
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  // Form states
  const [weightForm, setWeightForm] = useState({ weight: '', date: new Date().toISOString().split('T')[0] });
  const [heightForm, setHeightForm] = useState(height.toString());

  const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : 0;
  
  const bmi = useMemo(() => {
    if (height === 0 || currentWeight === 0) return 0;
    const heightInMeters = height / 100;
    return (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);
  }, [height, currentWeight]);

  const getBmiStatus = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: 'Thiếu cân', colorClass: styles.warningText };
    if (bmiValue >= 18.5 && bmiValue < 24.9) return { label: 'Bình thường', colorClass: styles.statFooter }; // default green
    if (bmiValue >= 25 && bmiValue < 29.9) return { label: 'Thừa cân', colorClass: styles.warningText };
    return { label: 'Béo phì', colorClass: styles.dangerText };
  };

  const bmiStatus = getBmiStatus(parseFloat(bmi.toString()));

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightForm.weight) return;
    
    const newWeight = parseFloat(weightForm.weight);
    // Add to history (in a real app, we'd sort by date)
    const formattedDate = new Date(weightForm.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    setWeightHistory([...weightHistory, { date: formattedDate, weight: newWeight }]);
    setHeight(parseFloat(heightForm));
    setIsWeightModalOpen(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(5, 15, 25, 0.9)', border: '1px solid #00ffaa', padding: '10px', borderRadius: '4px' }}>
          <p style={{ color: '#a0c4ff', margin: '0 0 5px 0' }}>{label}</p>
          <p style={{ color: '#00ffaa', margin: 0, fontWeight: 'bold' }}>{payload[0].value} kg</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.healthContainer}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Activity className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>Health Monitor</h1>
        </div>
      </div>

      <div className={styles.gridStats}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Scale size={18} /> Cân nặng hiện tại
          </div>
          <div className={styles.statValue}>
            {currentWeight} <span className={styles.statUnit}>kg</span>
          </div>
          <div className={styles.statFooter}>
            Đã cập nhật hôm nay
          </div>
          <button className={styles.actionButton} onClick={() => setIsWeightModalOpen(true)}>
            <Edit2 size={18} />
          </button>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Ruler size={18} /> Chiều cao
          </div>
          <div className={styles.statValue}>
            {height} <span className={styles.statUnit}>cm</span>
          </div>
          <div className={styles.statFooter}>
            Ít biến động
          </div>
          <button className={styles.actionButton} onClick={() => setIsWeightModalOpen(true)}>
            <Edit2 size={18} />
          </button>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Activity size={18} /> Chỉ số BMI
          </div>
          <div className={styles.statValue}>
            {bmi}
          </div>
          <div className={`${styles.statFooter} ${bmiStatus.colorClass}`}>
            Trạng thái: {bmiStatus.label}
          </div>
        </div>
      </div>

      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>Biến động cân nặng (30 ngày)</div>
          <button className={styles.logButton} onClick={() => setIsWeightModalOpen(true)}>
            <Plus size={16} /> Cập nhật
          </button>
        </div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightHistory} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.2)" vertical={false} />
              <XAxis dataKey="date" stroke="#a0c4ff" tick={{ fill: '#a0c4ff' }} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#a0c4ff" tick={{ fill: '#a0c4ff' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(var(--sao-primary-rgb), 0.4)', strokeWidth: 2 }} />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="var(--sao-primary-hex)" 
                strokeWidth={3}
                dot={{ r: 5, fill: '#0a192d', stroke: 'var(--sao-primary-hex)', strokeWidth: 2 }}
                activeDot={{ r: 8, fill: 'var(--sao-primary-hex)', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MODAL: WEIGHT & HEIGHT */}
      <SaoModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        title="Cập nhật chỉ số cơ thể"
        icon={<Scale size={20} />}
      >
        <form onSubmit={handleSaveWeight}>
          <div className={styles.formGroup}>
            <label>Ngày ghi nhận</label>
            <input 
              type="date" 
              className={styles.input}
              value={weightForm.date}
              onChange={e => setWeightForm({...weightForm, date: e.target.value})}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Cân nặng (kg)</label>
            <input 
              type="number" 
              step="0.1"
              className={styles.input}
              placeholder="Vd: 65.5" 
              value={weightForm.weight}
              onChange={e => setWeightForm({...weightForm, weight: e.target.value})}
              required
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Chiều cao hiện tại (cm)</label>
            <input 
              type="number" 
              className={styles.input}
              value={heightForm}
              onChange={e => setHeightForm(e.target.value)}
              required
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={`${styles.btn} ${styles.cancelBtn}`} onClick={() => setIsWeightModalOpen(false)}>
              Hủy bỏ
            </button>
            <button type="submit" className={`${styles.btn} ${styles.saveBtn}`}>
              Lưu chỉ số
            </button>
          </div>
        </form>
      </SaoModal>
    </div>
  );
}
