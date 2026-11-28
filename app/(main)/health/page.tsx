"use client";

import { useState, useMemo, useEffect } from 'react';
import { Activity, Scale, Ruler, Sparkles, RefreshCw, Clock, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar
} from 'recharts';
import styles from './health.module.css';
import SaoModal from '@/app/components/SaoModal';
import SaoInput from '@/app/components/SaoInput';
import SaoButton from '@/app/components/SaoButton';
import SaoDatePicker from '@/app/components/SaoDatePicker';
import SaoLoading from '@/app/components/SaoLoading';
import SaoPanel from '@/app/components/SaoPanel';
import SaoSummaryCard, { SummaryCardVariant } from '@/app/components/SaoSummaryCard';
import { useSaoAlert } from '../../contexts/AlertContext';
import { getHealthData, getHealthMacros, getAiAnalysis, saveHealthData, requestAiAnalysis } from './api';

import { WeightEntry } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

export default function HealthPage() {
  const { t, language } = useI18n();
  const [height, setHeight] = useState<number>(170); // cm
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [macros, setMacros] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
    const handleHealthUpdate = () => fetchHealthData(true);
    window.addEventListener('sao-health-updated', handleHealthUpdate);
    return () => window.removeEventListener('sao-health-updated', handleHealthUpdate);
  }, []);

  const fetchHealthData = async (force = false) => {
    try {
      const [data, macrosData, aiData]: any[] = await Promise.all([
        getHealthData(force),
        getHealthMacros(force),
        getAiAnalysis()
      ]);
      if (data) {
        setHeight(data.height || 170);
        setHeightForm(data.height?.toString() || '170');
        if (data.history) setWeightHistory(data.history);
      }
      if (macrosData) setMacros(macrosData);
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
    setWeightForm({ weight: '', date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] });
    setHeightForm(height.toString());
    setIsWeightModalOpen(true);
  };

  // Form states
  const [weightForm, setWeightForm] = useState({ weight: '', date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] });
  const [heightForm, setHeightForm] = useState(height.toString());

  const { showAlert } = useSaoAlert();

  const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : 0;
  
  const getLastUpdateText = () => {
    if (weightHistory.length === 0) return 'Chưa có dữ liệu';
    const lastDateStr = weightHistory[weightHistory.length - 1].date;
    if (!lastDateStr) return 'Đã cập nhật gần đây';
    
    // Normalize both dates to midnight local time for fair comparison
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    today.setUTCHours(0,0,0,0);
    
    const target = new Date(lastDateStr);
    target.setUTCHours(0,0,0,0);
    
    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('health.updatedToday');
    if (diffDays === 1) return t('health.updatedYesterday');
    if (diffDays <= 30) return `${diffDays} ${t('health.daysAgo')}`;
    
    const months = Math.floor(diffDays / 30);
    return `${months} ${t('health.monthsAgo')}`;
  };
  
  const lastUpdateText = getLastUpdateText();
  const bmi = useMemo(() => {
    if (height === 0 || currentWeight === 0) return 0;
    const heightInMeters = height / 100;
    return (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);
  }, [height, currentWeight]);

  const getBmiStatus = (bmiValue: number): { label: string; variant: SummaryCardVariant } => {
    if (!bmiValue || bmiValue <= 0) return { label: '--', variant: 'default' };
    if (bmiValue < 18.5) return { label: t('health.bmiUnderweight'), variant: 'balance' };
    if (bmiValue < 25) return { label: t('health.bmiNormal'), variant: 'income' };
    if (bmiValue < 30) return { label: t('health.bmiOverweight'), variant: 'balance' };
    return { label: t('health.bmiObese'), variant: 'expense' };
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
        showAlert(`${data.message}\nThưởng: +${data.rewardExp} EXP!`);
        window.dispatchEvent(new CustomEvent('sao-user-updated'));
      } else {
        showAlert(data.message);
      }
      fetchHealthData(true);
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

  const CustomWeightTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.chartTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue} style={{ color: 'var(--sao-primary-hex)' }}>
            {payload[0].value} kg
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomNutritionComboTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const caloEntry = payload.find((p: any) => p.dataKey === 'calo');
      const macroEntries = payload.filter((p: any) => p.dataKey !== 'calo');
      
      const formattedLabel = typeof label === 'string' && label.includes('-') 
        ? label.split('-').reverse().join('/') 
        : label;

      return (
        <div className={styles.chartTooltip}>
          <p className={styles.tooltipLabel}>{formattedLabel}</p>
          {caloEntry && (
            <div className={styles.tooltipCaloHeader}>
              <span className={styles.tooltipCaloBadge}>
                <Zap size={13} className={styles.caloIcon} /> Calo:
              </span>
              <span className={styles.tooltipCaloValue}>{caloEntry.value} Kcal</span>
            </div>
          )}
          {macroEntries.length > 0 && (
            <div className={styles.tooltipMacroSection}>
              {macroEntries.map((entry: any, index: number) => (
                <div key={index} className={styles.tooltipMacroRow}>
                  <span style={{ color: entry.color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
                    {entry.name}:
                  </span>
                  <span className={styles.tooltipMacroVal}>{entry.value} g</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={styles.healthContainer}>
        <SaoLoading fullPage />
      </div>
    );
  }

  return (
    <div className={styles.healthContainer}>
      <div className={styles.scrollArea}>
        {/* 3 THẺ CHỈ SỐ CƠ THỂ (VITALS METRIC CARDS) */}
        <div className={styles.gridStats}>
          <SaoSummaryCard
            title={t('health.weight')}
            amount={currentWeight}
            currency="kg"
            icon={<Scale size={18} />}
            subText={lastUpdateText}
            variant="primary"
            onClick={openWeightModal}
          />

          <SaoSummaryCard
            title={t('health.height')}
            amount={height}
            currency="cm"
            icon={<Ruler size={18} />}
            subText={lastUpdateText}
            variant="default"
            onClick={openWeightModal}
          />

          <SaoSummaryCard
            title={t('health.bmi')}
            amount={bmi}
            currency=""
            icon={<Activity size={18} />}
            subText={`${t('common.status')}: ${bmiStatus.label}`}
            variant={bmiStatus.variant}
            className={styles.bmiCard}
          />
        </div>

        {/* PANEL 1: BIẾN ĐỘNG CÂN NẶNG */}
        <SaoPanel
          title={t('health.weightFluctuation')}
          icon={<Scale size={18} />}
          variant="primary"
        >
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={260} minHeight={260}>
              <LineChart data={weightHistory} margin={{ top: 10, right: 20, bottom: 25, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.15)" vertical={false} />
                <XAxis dataKey="dateLabel" stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 12 }} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#a0c4ff" tick={{ fill: '#a0c4ff', fontSize: 12 }} />
                <Tooltip content={<CustomWeightTooltip />} cursor={{ stroke: 'rgba(var(--sao-primary-rgb), 0.4)', strokeWidth: 1.5 }} />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  name={t('health.weight')}
                  stroke="var(--sao-primary-hex)" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0a192d', stroke: 'var(--sao-primary-hex)', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: 'var(--sao-primary-hex)', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SaoPanel>

        {/* PANEL 2: DINH DƯỠNG 7 NGÀY GẦN NHẤT (COMBO CHART CALO & MACROS) */}
        <SaoPanel
          title={t('health.nutrition7Days')}
          icon={<Activity size={18} />}
          variant="cyan"
        >
          {/* Cụm chú thích Legend đưa lên đầu biểu đồ, đường Calo đứng đầu */}
          <div className={styles.legendRow}>
            <div className={styles.legendItem}>
              <span className={styles.legendCaloLine}>
                <span className={styles.legendCaloDot} />
              </span>
              <span className={styles.legendCaloText}>Calories (Kcal)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendMacroSquare} style={{ background: '#00f0ff', boxShadow: '0 0 6px #00f0ff' }} />
              <span style={{ color: '#00f0ff' }}>{t('health.protein')} (g)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendMacroSquare} style={{ background: '#00ffaa', boxShadow: '0 0 6px #00ffaa' }} />
              <span style={{ color: '#00ffaa' }}>{t('health.carbs')} (g)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendMacroSquare} style={{ background: '#ffaa00', boxShadow: '0 0 6px #ffaa00' }} />
              <span style={{ color: '#ffaa00' }}>{t('health.fat')} (g)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendMacroSquare} style={{ background: '#ff4444', boxShadow: '0 0 6px #ff4444' }} />
              <span style={{ color: '#ff4444' }}>{t('health.sugar')} (g)</span>
            </div>
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={270} minHeight={270}>
              <ComposedChart data={macros} margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--sao-primary-rgb), 0.12)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#a0c4ff" 
                  tick={{ fill: '#a0c4ff', fontSize: 11 }}
                  tickFormatter={(str: string) => {
                    if (!str) return '';
                    const parts = str.split('-');
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : str;
                  }}
                />
                {/* Trục trái (Left Y-Axis): Năng lượng Calo (Kcal) */}
                <YAxis 
                  yAxisId="calo" 
                  orientation="left" 
                  stroke="#ffaa00" 
                  tick={{ fill: '#ffaa00', fontSize: 11 }}
                  tickFormatter={(v) => `${v}`}
                  width={46}
                />
                {/* Trục phải (Right Y-Axis): Cơ cấu dinh dưỡng Macros (g) */}
                <YAxis 
                  yAxisId="macro" 
                  orientation="right" 
                  stroke="#00f0ff" 
                  tick={{ fill: '#00f0ff', fontSize: 11 }}
                  tickFormatter={(v) => `${v}g`}
                  width={46}
                />
                <Tooltip content={<CustomNutritionComboTooltip />} />
                {/* Cột xếp chồng: Macros dinh dưỡng (g) - Nâng độ rộng lên 52px để cột to, rõ ràng */}
                <Bar yAxisId="macro" dataKey="protein" name={`${t('health.protein')} (g)`} stackId="macro" fill="#00f0ff" maxBarSize={52} />
                <Bar yAxisId="macro" dataKey="carbs" name={`${t('health.carbs')} (g)`} stackId="macro" fill="#00ffaa" maxBarSize={52} />
                <Bar yAxisId="macro" dataKey="fat" name={`${t('health.fat')} (g)`} stackId="macro" fill="#ffaa00" maxBarSize={52} />
                <Bar yAxisId="macro" dataKey="sugar" name={`${t('health.sugar')} (g)`} stackId="macro" fill="#ff4444" radius={[4, 4, 0, 0]} maxBarSize={52} />
                {/* Đường line nổi bật: Tổng năng lượng Calories (Kcal) */}
                <Line 
                  yAxisId="calo" 
                  type="monotone" 
                  dataKey="calo" 
                  name="Calories (Kcal)" 
                  stroke="#ffaa00" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#0a192d', stroke: '#ffaa00', strokeWidth: 2 }} 
                  activeDot={{ r: 7, fill: '#ffaa00', stroke: '#fff', strokeWidth: 2 }} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SaoPanel>

        {/* PANEL 3: BÁC SĨ AI (TRỢ LÝ YUI PHÂN TÍCH THỂ TRẠNG) */}
        <SaoPanel
          title={t('health.aiAnalysisTitle')}
          icon={<Sparkles size={18} />}
          variant="gold"
          headerActions={
            <SaoButton onClick={handleRequestAI} disabled={isAnalyzing} variant="primary">
              {isAnalyzing ? (
                <>
                  <RefreshCw size={15} className={styles.spin} /> {t('health.analyzing')}
                </>
              ) : (
                <>
                  <Sparkles size={15} /> {t('health.analyzeNow')}
                </>
              )}
            </SaoButton>
          }
        >
          {aiAnalysis ? (
            <div className={styles.aiResultWrapper}>
              <div className={styles.analyzedTimeBadge}>
                <Clock size={13} />
                <span>{t('health.analyzedAt')}: {new Date(aiAnalysis.analyzed_at).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</span>
              </div>
              <div className={styles.markdownContent}>
                <ReactMarkdown>{aiAnalysis.analysis_text}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className={styles.emptyAiBox}>
              <Sparkles size={32} className={styles.emptySparkleIcon} />
              <p>{t('health.emptyAiAnalysis')}</p>
            </div>
          )}
        </SaoPanel>
      </div>

      {/* MODAL: WEIGHT & HEIGHT */}
      <SaoModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        title={t('health.updateVitalsModal')}
        icon={<Scale size={20} />}
      >
        <form onSubmit={handleSaveWeight} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>{t('health.recordDate')}</label>
            <SaoDatePicker 
              value={weightForm.date}
              onChange={v => setWeightForm({...weightForm, date: v})}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>{t('health.weight')} (kg)</label>
            <SaoInput 
              type="number" 
              step="0.1"
              placeholder="Vd: 65.5" 
              value={weightForm.weight}
              onChange={e => setWeightForm({...weightForm, weight: e.target.value})}
              required
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>{t('health.currentHeight')} (cm)</label>
            <SaoInput 
              type="number" 
              value={heightForm}
              onChange={e => setHeightForm(e.target.value)}
              required
            />
          </div>

          <div className={styles.modalFooter}>
            <SaoButton type="button" variant="default" onClick={() => setIsWeightModalOpen(false)}>
              {t('common.cancel')}
            </SaoButton>
            <SaoButton type="submit" variant="primary">
              {t('common.save')}
            </SaoButton>
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
