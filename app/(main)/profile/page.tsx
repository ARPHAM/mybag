"use client";

import { useState, useEffect } from 'react';
import { User, Mail, Shield, Save, Loader2, Heart, Brain, Zap, Calendar, KeyRound, Lock } from 'lucide-react';
import SaoInput from '@/app/components/SaoInput';
import SaoButton from '@/app/components/SaoButton';
import SaoImageUpload from '@/app/components/SaoImageUpload';
import SaoPanel from '@/app/components/SaoPanel';
import SaoLoading from '@/app/components/SaoLoading';
import { useSaoAlert } from '../../contexts/AlertContext';
import { useI18n } from '@/lib/i18n';
import { getExpForNextLevel, MAX_LEVEL } from '@/lib/gameLevel';
import styles from './profile.module.css';

export default function ProfileDashboard() {
  const { t } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    avatar_url: '',
    password: '',
    new_password: '',
    confirm_password: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { showAlert } = useSaoAlert();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setFormData(prev => ({
          ...prev,
          username: data.user.username,
          email: data.user.email,
          avatar_url: data.user.avatar_url || '',
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarUpload = (url: string) => {
    setFormData(prev => ({ ...prev, avatar_url: url }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      showAlert(t('profile.passwordMismatch'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          avatar_url: formData.avatar_url,
          password: formData.password,
          new_password: formData.new_password,
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert(t('profile.updateSuccess'));
        // Dispatch global event to update header avatar instantly
        window.dispatchEvent(new CustomEvent('sao-user-updated'));
        setFormData(prev => ({ ...prev, password: '', new_password: '', confirm_password: '' }));
      } else {
        showAlert(data.error || t('profile.updateFailed'));
      }
    } catch (err) {
      showAlert(t('profile.error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <SaoLoading fullPage />;
  }

  // Thông số người chơi (Player Telemetry & Progression)
  const level = Math.min(MAX_LEVEL, Math.max(1, user.level || 1));
  const isMaxLevel = level >= MAX_LEVEL;

  // HP: Làm tròn số nguyên không để số lẻ
  const currentHp = Math.round(user.current_hp ?? 1000);
  const maxHp = Math.round(user.max_hp ?? 1000);
  const hpPercent = Math.min(100, Math.max(0, Math.round((currentHp / maxHp) * 100)));

  // MP: Làm tròn số nguyên không để số lẻ
  const currentMp = Math.round(user.current_mp ?? 500);
  const maxMp = Math.round(user.max_mp ?? 500);
  const mpPercent = Math.min(100, Math.max(0, Math.round((currentMp / maxMp) * 100)));

  // EXP: Tính toán theo thang lũy tiến (tối đa cấp 10)
  const currentExp = user.current_exp ?? 0;
  const maxExp = getExpForNextLevel(level);
  const expPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, Math.round((currentExp / maxExp) * 100)));

  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : null;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.scrollContent}>
        <form onSubmit={handleSave} className={styles.profileForm}>
          <div className={styles.profileGrid}>
            {/* CỘT TRÁI: THẺ NHÂN VẬT (PLAYER CARD) */}
            <div className={styles.playerColumn}>
              <SaoPanel 
                title={t('profile.avatarSection')} 
                icon={<User size={16} />} 
                variant="primary"
                className={styles.playerPanel}
              >
                <div className={styles.playerCardBody}>
                  {/* Khung Giáp Avatar MMORPG cách điệu lồng lộn */}
                  <div className={styles.gameAvatarChassis}>
                    {/* 4 ngàm quang học góc (Corner Reticles) */}
                    <span className={`${styles.cornerReticle} ${styles.reticleTL}`} aria-hidden="true" />
                    <span className={`${styles.cornerReticle} ${styles.reticleTR}`} aria-hidden="true" />
                    <span className={`${styles.cornerReticle} ${styles.reticleBL}`} aria-hidden="true" />
                    <span className={`${styles.cornerReticle} ${styles.reticleBR}`} aria-hidden="true" />

                    {/* Khung giáp bát giác MMORPG bọc kín (Armor Bezel) */}
                    <div className={styles.avatarBezel}>
                      <div 
                        className={styles.avatarPhoto} 
                        style={{ backgroundImage: formData.avatar_url ? `url(${formData.avatar_url})` : 'none' }}
                      >
                        {!formData.avatar_url && <User size={48} className={styles.avatarPlaceholder} />}
                        <div className={styles.avatarScanline} aria-hidden="true" />
                        <div className={styles.holoGridOverlay} aria-hidden="true" />
                      </div>
                    </div>

                    {/* Huy hiệu Cấp độ cách điệu phong cách game MMORPG (Rank Crest Plate) */}
                    <div className={styles.rankCrest}>
                      <span className={styles.crestWingLeft}>«</span>
                      <span className={styles.crestDiamond}>❖</span>
                      <span className={styles.crestText}>{isMaxLevel ? 'LV.MAX' : `LV.${level}`}</span>
                      <span className={styles.crestDiamond}>❖</span>
                      <span className={styles.crestWingRight}>»</span>
                    </div>
                  </div>

                  {/* Thanh chỉ số HP, MP & EXP */}
                  <div className={styles.statsBlock}>
                    {/* HP Bar */}
                    <div className={styles.statRow}>
                      <div className={styles.statLabelRow}>
                        <span className={styles.statTitle}><Heart size={12} className={styles.hpIcon} /> HP</span>
                        <span className={styles.statValue}>{currentHp} / {maxHp}</span>
                      </div>
                      <div className={styles.gaugeTrack}>
                        <div 
                          className={`${styles.gaugeFill} ${styles.gaugeHp}`} 
                          style={{ width: `${hpPercent}%` }} 
                        />
                      </div>
                    </div>

                    {/* MP Bar */}
                    <div className={styles.statRow}>
                      <div className={styles.statLabelRow}>
                        <span className={styles.statTitle}><Brain size={12} className={styles.mpIcon} /> MP</span>
                        <span className={styles.statValue}>{currentMp} / {maxMp}</span>
                      </div>
                      <div className={styles.gaugeTrack}>
                        <div 
                          className={`${styles.gaugeFill} ${styles.gaugeMp}`} 
                          style={{ width: `${mpPercent}%` }} 
                        />
                      </div>
                    </div>

                    {/* EXP Bar */}
                    <div className={styles.statRow}>
                      <div className={styles.statLabelRow}>
                        <span className={styles.statTitle}><Zap size={12} className={styles.expIcon} /> EXP</span>
                        <span className={styles.statValue}>{isMaxLevel ? 'MAX (ĐẠT ĐỈNH)' : `${currentExp} / ${maxExp}`}</span>
                      </div>
                      <div className={styles.gaugeTrack}>
                        <div 
                          className={`${styles.gaugeFill} ${styles.gaugeExp}`} 
                          style={{ width: `${expPercent}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {joinDate && (
                    <div className={styles.joinDateRow}>
                      <Calendar size={13} />
                      <span>Gia nhập: {joinDate}</span>
                    </div>
                  )}

                  {/* Nút Upload Avatar Căn Giữa */}
                  <div className={styles.uploadBox}>
                    <SaoImageUpload 
                      label={t('profile.uploadAvatar')} 
                      onUploadSuccess={handleAvatarUpload}
                      align="center"
                    />
                  </div>
                </div>
              </SaoPanel>
            </div>

            {/* CỘT PHẢI: FORM THÔNG TIN & BẢO MẬT */}
            <div className={styles.formColumn}>
              {/* Khối 1: Thông tin cơ bản */}
              <SaoPanel 
                title={t('profile.basicInfo')} 
                icon={<User size={16} />} 
                variant="cyan"
              >
                <div className={styles.panelFormContent}>
                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>
                      <User size={15} /> 
                      <span>{t('profile.username')}</span>
                    </label>
                    <SaoInput 
                      name="username" 
                      value={formData.username} 
                      onChange={handleChange} 
                      required 
                      placeholder="Nhập tên nhân vật..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>
                      <Mail size={15} /> 
                      <span>{t('profile.email')}</span>
                    </label>
                    <div className={styles.lockedFieldWrapper}>
                      <SaoInput 
                        name="email" 
                        value={formData.email} 
                        disabled 
                        className={styles.lockedEmailInput}
                      />
                      <div className={styles.lockedBadge}>
                        <Lock size={12} />
                        <span>KHÓA HỆ THỐNG</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SaoPanel>

              {/* Khối 2: Bảo mật & Mật khẩu */}
              <SaoPanel 
                title={t('profile.security')} 
                icon={<Shield size={16} />} 
                variant="gold"
              >
                <div className={styles.panelFormContent}>
                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>
                      <KeyRound size={15} /> 
                      <span>{t('profile.oldPassword')}</span>
                    </label>
                    <SaoInput 
                      name="password" 
                      type="password" 
                      value={formData.password} 
                      onChange={handleChange} 
                      placeholder={t('profile.oldPasswordPlaceholder')}
                    />
                  </div>
                  
                  {formData.password && (
                    <div className={styles.passwordExpansion}>
                      <div className={styles.formGroup}>
                        <label className={styles.fieldLabel}>
                          <span>{t('profile.newPassword')}</span>
                        </label>
                        <SaoInput 
                          name="new_password" 
                          type="password" 
                          value={formData.new_password} 
                          onChange={handleChange} 
                          required
                          placeholder="Mật khẩu mới (tối thiểu 6 ký tự)..."
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.fieldLabel}>
                          <span>{t('profile.confirmPassword')}</span>
                        </label>
                        <SaoInput 
                          name="confirm_password" 
                          type="password" 
                          value={formData.confirm_password} 
                          onChange={handleChange} 
                          required
                          placeholder="Xác nhận lại mật khẩu mới..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </SaoPanel>

              {/* Nút Submit Lưu hồ sơ */}
              <div className={styles.formActions}>
                <SaoButton 
                  variant="primary" 
                  type="submit" 
                  disabled={isSaving}
                  className={styles.saveBtn}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{t('profile.saveProfile').toUpperCase()}</span>
                </SaoButton>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
