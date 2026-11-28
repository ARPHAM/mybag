"use client";

import { useState, useEffect } from 'react';
import {
  Palette,
  LogOut,
  Languages,
  Image as ImageIcon,
  Shield,
  Type
} from 'lucide-react';
import { logoutUser, updateUserPreferences } from './api';
import { useI18n } from '@/lib/i18n';
import SaoPanel from '@/app/components/SaoPanel';
import SaoButton from '@/app/components/SaoButton';
import SaoConfirmModal from '@/app/components/SaoConfirmModal';
import LanguageCard from '@/app/components/settings/LanguageCard';
import ThemeCard, { ThemeConfig } from '@/app/components/settings/ThemeCard';
import WallpaperPicker from '@/app/components/settings/WallpaperPicker';
import styles from './settings.module.css';

const THEME_IDS = [
  { id: 'cyan', color: '#00f0ff' },
  { id: 'yellow', color: '#ffaa00' },
  { id: 'red', color: '#ff4444' },
  { id: 'green', color: '#00ffaa' },
  { id: 'purple', color: '#b900ff' },
  { id: 'magenta', color: '#ff00ff' },
  { id: 'orange', color: '#ff5500' },
  { id: 'white', color: '#ffffff' },
];

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const [activeTheme, setActiveTheme] = useState('cyan');
  const [fontScale, setFontScale] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sao-theme');
    if (saved) {
      setActiveTheme(saved);
    }
    const savedScale = localStorage.getItem('sao-font-scale');
    if (savedScale === 'normal' || savedScale === 'large' || savedScale === 'xlarge') {
      setFontScale(savedScale);
    }
  }, []);

  const handleThemeSelect = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem('sao-theme', themeId);

    // Dispatch event to layout to update variables instantly
    const event = new CustomEvent('sao-theme-changed', { detail: themeId });
    window.dispatchEvent(event);

    // Sync cross-device preference to server (v1.2)
    updateUserPreferences({ theme_color: themeId }).catch((err) => console.error(err));
  };

  const handleFontScaleSelect = (scale: 'normal' | 'large' | 'xlarge') => {
    setFontScale(scale);
    localStorage.setItem('sao-font-scale', scale);
    window.dispatchEvent(new CustomEvent('sao-font-scale-changed', { detail: scale }));
    updateUserPreferences({ font_scale: scale }).catch((err) => console.error(err));
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutUser();
    } catch (err) {
      console.error(err);
    } finally {
      window.location.href = '/login';
    }
  };

  const themes: ThemeConfig[] = THEME_IDS.map((item) => ({
    id: item.id,
    name: t(`settings.themes.${item.id}.name`),
    desc: t(`settings.themes.${item.id}.desc`),
    color: item.color
  }));

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.scrollArea}>
        {/* SECTION 1: LANGUAGE */}
        <SaoPanel
          variant="cyan"
          title={t('settings.language')}
          icon={<Languages size={20} />}
          className={styles.sectionPanel}
        >
          <div className={styles.languageGrid}>
            <LanguageCard
              code="vi"
              flag="🇻🇳"
              title="Tiếng Việt"
              sub={t('settings.viSub')}
              isActive={language === 'vi'}
              onSelect={() => setLanguage('vi')}
            />
            <LanguageCard
              code="en"
              flag="🇺🇸"
              title="English"
              sub={t('settings.enSub')}
              isActive={language === 'en'}
              onSelect={() => setLanguage('en')}
            />
          </div>
        </SaoPanel>

        {/* SECTION 2: THEME */}
        <SaoPanel
          variant="primary"
          title={t('settings.theme')}
          icon={<Palette size={20} />}
          className={styles.sectionPanel}
        >
          <div className={styles.themeGrid}>
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={activeTheme === theme.id}
                onSelect={handleThemeSelect}
              />
            ))}
          </div>
        </SaoPanel>

        {/* SECTION 2B: ACCESSIBILITY & FONT SCALE (v1.2) */}
        <SaoPanel
          variant="cyan"
          title={language === 'en' ? 'Display Font Size (Accessibility)' : 'Cỡ chữ hiển thị (Hỗ trợ dễ đọc)'}
          icon={<Type size={20} />}
          className={styles.sectionPanel}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {[
              { id: 'normal' as const, label: language === 'en' ? 'Default (100%)' : 'Mặc định (100%)', desc: language === 'en' ? 'Standard SAO HUD density' : 'Gọn gàng chuẩn SAO HUD', sample: '16px' },
              { id: 'large' as const, label: language === 'en' ? 'Large (112%)' : 'Chữ lớn (112%)', desc: language === 'en' ? 'Comfortable reading on phone' : 'Thoải mái hơn trên điện thoại', sample: '18px' },
              { id: 'xlarge' as const, label: language === 'en' ? 'Extra Large (122%)' : 'Siêu to rõ (122%)', desc: language === 'en' ? 'High visibility outdoors' : 'Dễ đọc ngoài trời / khi chạy xe', sample: '19.5px' }
            ].map((opt) => {
              const active = fontScale === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleFontScaleSelect(opt.id)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: active ? 'rgba(var(--sao-primary-rgb, 0, 240, 255), 0.16)' : 'rgba(6, 18, 35, 0.55)',
                    border: active ? '1.5px solid var(--sao-primary-hex, #00f0ff)' : '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: opt.sample, color: active ? 'var(--sao-primary-hex, #00f0ff)' : '#ffffff' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </SaoPanel>

        {/* SECTION 3: WALLPAPER & AMBIENT HUD */}
        <SaoPanel
          variant="primary"
          title={t('settings.wallpaper')}
          icon={<ImageIcon size={20} />}
          className={styles.sectionPanel}
        >
          <WallpaperPicker />
        </SaoPanel>

        {/* SECTION 4: ACCOUNT MANAGEMENT */}
        <SaoPanel
          variant="danger"
          title={t('settings.account')}
          icon={<LogOut size={20} />}
          className={styles.sectionPanel}
        >
          <div className={styles.accountBox}>
            <div className={styles.accountInfo}>
              <div className={styles.accountTitleRow}>
                <Shield size={18} className={styles.shieldIcon} />
                <span className={styles.accountTitle}>{t('settings.accountSessionTitle')}</span>
              </div>
              <p className={styles.accountDesc}>
                {t('settings.accountSessionDesc')}
              </p>
            </div>
            <div className={styles.accountAction}>
              <SaoButton
                variant="danger"
                onClick={() => setLogoutModalOpen(true)}
              >
                <LogOut size={16} />
                <span>{t('settings.logout')}</span>
              </SaoButton>
            </div>
          </div>
        </SaoPanel>
      </div>

      {/* CONFIRM LOGOUT MODAL */}
      <SaoConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title={t('settings.logout')}
        message={t('settings.logoutConfirm')}
        confirmText={t('settings.logout')}
        confirmVariant="danger"
        isLoading={isLoggingOut}
      />
    </div>
  );
}
