"use client";

import { useState, useEffect } from 'react';
import {
  Palette,
  LogOut,
  Languages,
  Image as ImageIcon,
  Shield
} from 'lucide-react';
import { logoutUser } from './api';
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
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sao-theme');
    if (saved) {
      setActiveTheme(saved);
    }
  }, []);

  const handleThemeSelect = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem('sao-theme', themeId);

    // Dispatch event to layout to update variables instantly
    const event = new CustomEvent('sao-theme-changed', { detail: themeId });
    window.dispatchEvent(event);
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
          <div className={styles.sectionDesc}>{t('settings.languageDesc')}</div>
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

        {/* SECTION 3: WALLPAPER & AMBIENT HUD */}
        <SaoPanel
          variant="primary"
          title={t('settings.wallpaper')}
          icon={<ImageIcon size={20} />}
          className={styles.sectionPanel}
        >
          <div className={styles.sectionDesc}>{t('settings.wallpaperDesc')}</div>
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
