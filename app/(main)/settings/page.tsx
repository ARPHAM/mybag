"use client";

import { useState, useEffect } from 'react';
import { Settings, Palette, CheckCircle2, LogOut, Languages } from 'lucide-react';
import { logoutUser } from './api';
import { useSaoAlert } from '../../contexts/AlertContext';
import { useI18n, Language } from '../../contexts/I18nContext';
import styles from './settings.module.css';

interface ThemeConfig {
  id: string;
  nameKey: string;
  descKey: string;
  color: string;
}

const THEMES: ThemeConfig[] = [
  { id: 'cyan', nameKey: 'settings.themes.cyan.name', descKey: 'settings.themes.cyan.desc', color: '#00f0ff' },
  { id: 'yellow', nameKey: 'settings.themes.yellow.name', descKey: 'settings.themes.yellow.desc', color: '#ffaa00' },
  { id: 'red', nameKey: 'settings.themes.red.name', descKey: 'settings.themes.red.desc', color: '#ff4444' },
  { id: 'green', nameKey: 'settings.themes.green.name', descKey: 'settings.themes.green.desc', color: '#00ffaa' },
  { id: 'purple', nameKey: 'settings.themes.purple.name', descKey: 'settings.themes.purple.desc', color: '#b900ff' },
  { id: 'magenta', nameKey: 'settings.themes.magenta.name', descKey: 'settings.themes.magenta.desc', color: '#ff00ff' },
  { id: 'orange', nameKey: 'settings.themes.orange.name', descKey: 'settings.themes.orange.desc', color: '#ff5500' },
  { id: 'white', nameKey: 'settings.themes.white.name', descKey: 'settings.themes.white.desc', color: '#ffffff' },
];

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const [activeTheme, setActiveTheme] = useState('cyan');
  const { showConfirm } = useSaoAlert();

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
    showConfirm(t('settings.logoutConfirm'), async () => {
      try {
        await logoutUser();
      } catch (err) {
        console.error(err);
      } finally {
        window.location.href = '/login';
      }
    });
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Settings className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>{t('settings.title')}</h1>
        </div>
      </div>

      <div className={styles.scrollArea}>
        {/* LANGUAGE SECTION */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Languages size={20} />
            <span>{t('settings.language')}</span>
          </div>

          <div className={styles.languageGrid}>
            <div
              className={`${styles.languageCard} ${language === 'vi' ? styles.active : ''}`}
              onClick={() => setLanguage('vi')}
            >
              <div className={styles.languageInfo}>
                <div className={styles.languageTitle}>Tiếng Việt</div>
                <div className={styles.languageSub}>Ngôn ngữ tiếng Việt mặc định</div>
              </div>
              {language === 'vi' && <CheckCircle2 size={24} color="var(--sao-primary-hex)" />}
            </div>

            <div
              className={`${styles.languageCard} ${language === 'en' ? styles.active : ''}`}
              onClick={() => setLanguage('en')}
            >
              <div className={styles.languageInfo}>
                <div className={styles.languageTitle}>English</div>
                <div className={styles.languageSub}>English language interface</div>
              </div>
              {language === 'en' && <CheckCircle2 size={24} color="var(--sao-primary-hex)" />}
            </div>
          </div>
        </div>

        {/* THEME SECTION */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Palette size={20} />
            <span>{t('settings.theme')}</span>
          </div>
          
          <div className={styles.themeGrid}>
            {THEMES.map(theme => (
              <div 
                key={theme.id}
                className={`${styles.themeCard} ${activeTheme === theme.id ? styles.active : ''}`}
                onClick={() => handleThemeSelect(theme.id)}
              >
                <div className={styles.colorPreview} style={{ color: theme.color, background: `radial-gradient(circle, ${theme.color}40 0%, transparent 70%)` }}>
                  {activeTheme === theme.id ? <CheckCircle2 size={32} /> : null}
                </div>
                <div className={styles.themeName}>{t(theme.nameKey)}</div>
                <div className={styles.themeDesc}>{t(theme.descKey)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ACCOUNT SECTION */}
        <div className={styles.section} style={{ marginTop: '30px' }}>
          <div className={styles.sectionTitle} style={{ color: '#ff4444' }}>
            <LogOut size={20} />
            <span>{t('settings.account')}</span>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid #ff4444',
              color: '#ff4444',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'}
          >
            <LogOut size={18} /> {t('settings.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
