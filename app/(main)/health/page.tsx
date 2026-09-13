"use client";

import { useState, useMemo, useEffect } from 'react';
import { Activity, Edit2, Plus, Scale, Ruler, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import styles from './health.module.css';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoDatePicker from '../../components/SaoDatePicker/SaoDatePicker';
import SaoLoading from '../../components/SaoLoading/SaoLoading';
import { useSaoAlert } from '../../contexts/AlertContext';
import { getHealthData, getHealthMacros, getAiAnalysis, saveHealthData, requestAiAnalysis } from './api';

interface WeightEntry {
  date: string;
  weight: number;
}

export default function HealthPage() {
  const [height, setHeight] = useState<number>(170); // cm
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [macros, setMacros] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const data: any = await getHealthData();
      if (data) {
        setHeight(data.height || 170);
        setHeightForm(data.height?.toString() || '170');
        if (data.history) setWeightHistory(data.history);
      }

      const macrosData: any = await getHealthMacros();
      if (macrosData) setMacros(macrosData);
      
      const aiData: any = await getAiAnalysis();
      if (aiData) setAiAnalysis(aiData);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Modals state
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  const openWeightModal = () => {
    setWeightForm({ weight: '', date: new Date().toISOString().split('T')[0] });
    setHeightForm(height.toString());
    setIsWeightModalOpen(true);
  };

  // Form states
  const [weightForm, setWeightForm] = useState({ weight: '', date: new Date().toISOString().split('T')[0] });
  const [heightForm, setHeightForm] = useState(height.toString());

  const { showAlert } = useSaoAlert();

  const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : 0;
  
  const bmi = useMemo(() => {
    if (height === 0 || currentWeight === 0) return 0;
    const heightInMeters = height / 100;
    return (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);
  }, [height, currentWeight]);

  const getBmiStatus = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: 'Thiếu cân', colorClass: styles.warningText };
    if (bmiValue >= 18.5 && bmiValue < 24.9) return { label: 'Bình thường', colorClass: styles.statFooter };
    if (bmiValue >= 25 && bmiValue < 29.9) return { label: 'Thừa cân', colorClass: styles.warningText };
    return { label: 'Béo phì', colorClass: styles.dangerText };
  };

  const bmiStatus = getBmiStatus(parseFloat(bmi.toString()));

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightForm.weight) return;
    
    try {
      const data: any = await saveHealthData({ 
        weight: parseFloat(weightForm.weight), 
        height: parseFloat(heightForm),
        date: weightForm.date
      });
      
      if (data.rewardExp) {
        showAlert(`🎉 ${data.message}\nThưởng: +${data.rewardExp} EXP!`);
        window.dispatchEvent(new CustomEvent('sao-user-updated'));
      } else {
        showAlert(data.message);
      }
      fetchHealthData();
      setIsWeightModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestAI = async () => {
    setIsAnalyzing(true);
    try {
      const data: any = await requestAiAnalysis();
      if (data) {
        setAiAnalysis(data);
        showAlert("Phân tích AI thành công!");
      }
    } catch (e: any) {
      showAlert(e.message || "Lỗi kết nối");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(5, 15, 25, 0.9)', border: '1px solid #00ffaa', padding: '10px', borderRadius: '4px' }}>
          <p style={{ color: '#a0c4ff', margin: '0 0 5px 0' }}>{label}</p>
          <p style={{ color: '#00ffaa', margin: 0, fontWeight: 'bold' }}>{payload[0].value} {payload[0].name?.includes('Kcal') ? 'Kcal' : 'kg'}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={styles.healthContainer}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <Activity className={styles.titleIcon} size={28} />
            <h1 className={styles.title}>Health Monitor</h1>
          </div>
        </div>
        <SaoLoading fullPage />
      </div>
    );
  }

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
          <button className={styles.actionButton} onClick={openWeightModal}>
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
          <button className={styles.actionButton} onClick={openWeightModal}>
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
          <button className={styles.logButton} onClick={openWeightModal}>
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

      <div className={styles.chartSection} style={{ marginTop: '20px' }}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>Dinh dưỡng 7 ngày qua</div>
        </div>
        <div className={styles.chartContainer} style={{ height: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ flex: 1, minHeight: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={macros} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.2)" vertical={false} />
                <XAxis dataKey="date" stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 12 }} />
                <YAxis stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(var(--sao-primary-rgb), 0.4)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="calo" name="Calories (Kcal)" stroke="#ffaa00" strokeWidth={3} dot={{ r: 4, fill: '#ffaa00' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, minHeight: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={macros} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 12 }} />
                <YAxis stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'rgba(5, 15, 25, 0.9)', border: '1px solid #00ffaa', color: '#fff', borderRadius: '4px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="protein" name="Đạm (g)" stackId="a" fill="#00f0ff" />
                <Bar dataKey="carbs" name="Tinh bột (g)" stackId="a" fill="#00ffaa" />
                <Bar dataKey="fat" name="Béo (g)" stackId="a" fill="#ffaa00" />
                <Bar dataKey="sugar" name="Đường (g)" stackId="a" fill="#ff4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.chartSection} style={{ marginTop: '20px' }}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#00f0ff" /> Phân tích Dinh dưỡng AI (7 ngày)
          </div>
          <button className={styles.logButton} onClick={handleRequestAI} disabled={isAnalyzing}>
            {isAnalyzing ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang phân tích...</> : <><Sparkles size={16} /> Phân tích ngay</>}
          </button>
        </div>
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginTop: '10px' }}>
          {aiAnalysis ? (
            <>
              <div style={{ fontSize: '0.8rem', color: '#a0c4ff', marginBottom: '15px' }}>
                Phân tích lúc: {new Date(aiAnalysis.analyzed_at).toLocaleString('vi-VN')}
              </div>
              <div className={styles.markdownContent}>
                <ReactMarkdown>{aiAnalysis.analysis_text}</ReactMarkdown>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>
              Chưa có dữ liệu phân tích. Hãy bấm "Phân tích ngay" để AI đánh giá lịch sử ăn uống của bạn!
            </div>
          )}
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
            <SaoDatePicker 
              value={weightForm.date}
              onChange={v => setWeightForm({...weightForm, date: v})}
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
      
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
