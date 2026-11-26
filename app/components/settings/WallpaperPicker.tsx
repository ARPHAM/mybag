"use client";

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Link as LinkIcon,
  RotateCcw,
  Check,
  Eye,
  Sliders,
  Image as ImageIcon,
  Laptop,
  Smartphone
} from 'lucide-react';
import SaoInput from '@/app/components/SaoInput';
import SaoButton from '@/app/components/SaoButton';
import SaoImageUpload from '@/app/components/SaoImageUpload';
import { useI18n } from '@/lib/i18n';
import styles from './WallpaperPicker.module.css';

interface WallpaperPreset {
  id: string;
  nameKey: string;
  descKey: string;
  url: string;
  previewUrl: string;
}

const DESKTOP_PRESETS: WallpaperPreset[] = [
  {
    id: 'aincrad',
    nameKey: 'settings.presets.aincrad.name',
    descKey: 'settings.presets.aincrad.desc',
    url: '/image.png',
    previewUrl: '/image.png'
  },
  {
    id: 'cybersao',
    nameKey: 'settings.presets.cybersao.name',
    descKey: 'settings.presets.cybersao.desc',
    url: '/wallpapers/cyber_sao.jpg',
    previewUrl: '/wallpapers/cyber_sao.jpg'
  },
  {
    id: 'yggdrasil',
    nameKey: 'settings.presets.yggdrasil.name',
    descKey: 'settings.presets.yggdrasil.desc',
    url: '/wallpapers/yggdrasil.jpg',
    previewUrl: '/wallpapers/yggdrasil.jpg'
  },
  {
    id: 'underworld',
    nameKey: 'settings.presets.underworld.name',
    descKey: 'settings.presets.underworld.desc',
    url: '/wallpapers/underworld.jpg',
    previewUrl: '/wallpapers/underworld.jpg'
  },
  {
    id: 'nebula',
    nameKey: 'settings.presets.nebula.name',
    descKey: 'settings.presets.nebula.desc',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop',
    previewUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=480&auto=format&fit=crop'
  }
];

const MOBILE_PRESETS: WallpaperPreset[] = [
  {
    id: 'aincrad_mobile',
    nameKey: 'settings.presets.aincrad_mobile.name',
    descKey: 'settings.presets.aincrad_mobile.desc',
    url: '/wallpapers/aincrad_mobile.jpg',
    previewUrl: '/wallpapers/aincrad_mobile.jpg'
  },
  {
    id: 'underworld_mobile',
    nameKey: 'settings.presets.underworld_mobile.name',
    descKey: 'settings.presets.underworld_mobile.desc',
    url: '/wallpapers/underworld_mobile.jpg',
    previewUrl: '/wallpapers/underworld_mobile.jpg'
  },
  {
    id: 'yggdrasil_mobile',
    nameKey: 'settings.presets.yggdrasil_mobile.name',
    descKey: 'settings.presets.yggdrasil_mobile.desc',
    url: '/wallpapers/yggdrasil_mobile.jpg',
    previewUrl: '/wallpapers/yggdrasil_mobile.jpg'
  },
  {
    id: 'cybersao',
    nameKey: 'settings.presets.cybersao.name',
    descKey: 'settings.presets.cybersao.desc',
    url: '/wallpapers/cyber_sao.jpg',
    previewUrl: '/wallpapers/cyber_sao.jpg'
  },
  {
    id: 'underworld',
    nameKey: 'settings.presets.underworld.name',
    descKey: 'settings.presets.underworld.desc',
    url: '/wallpapers/underworld.jpg',
    previewUrl: '/wallpapers/underworld.jpg'
  }
];

interface DimPresetConfig {
  key: string;
  labelKey: string;
  value: number;
}

const DIM_PRESETS: DimPresetConfig[] = [
  { key: '40', labelKey: 'settings.dimPresets.light', value: 0.4 },
  { key: '60', labelKey: 'settings.dimPresets.standard', value: 0.6 },
  { key: '75', labelKey: 'settings.dimPresets.dark', value: 0.75 },
  { key: '90', labelKey: 'settings.dimPresets.ultraDark', value: 0.9 }
];

export default function WallpaperPicker() {
  const { t } = useI18n();
  const [deviceTab, setDeviceTab] = useState<'desktop' | 'mobile'>('desktop');
  const [desktopBg, setDesktopBg] = useState<string>('/image.png');
  const [mobileBg, setMobileBg] = useState<string>('');
  const [dimLevel, setDimLevel] = useState<number>(0.6);
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');

  useEffect(() => {
    // Detect screen width to initialize device tab
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setDeviceTab('mobile');
    }

    const savedDesktop = localStorage.getItem('sao-custom-bg-desktop') || localStorage.getItem('sao-custom-bg');
    if (savedDesktop) {
      setDesktopBg(savedDesktop);
    }

    const savedMobile = localStorage.getItem('sao-custom-bg-mobile');
    if (savedMobile) {
      setMobileBg(savedMobile);
    }

    const savedDim = localStorage.getItem('sao-bg-overlay');
    if (savedDim) {
      const parsed = parseFloat(savedDim);
      if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 0.99) {
        setDimLevel(parsed);
      }
    }
  }, []);

  const dispatchUpdate = () => {
    window.dispatchEvent(new CustomEvent('sao-wallpaper-changed'));
  };

  const currentBg = deviceTab === 'desktop' ? desktopBg : (mobileBg || desktopBg || '/image.png');
  const activePresets = deviceTab === 'desktop' ? DESKTOP_PRESETS : MOBILE_PRESETS;

  const applyWallpaper = async (url: string) => {
    if (!url.trim()) return;

    let newDesktop = desktopBg;
    let newMobile = mobileBg;

    if (deviceTab === 'desktop') {
      newDesktop = url;
      setDesktopBg(url);
      if (url === '/image.png') {
        localStorage.removeItem('sao-custom-bg-desktop');
        localStorage.removeItem('sao-custom-bg');
      } else {
        localStorage.setItem('sao-custom-bg-desktop', url);
        localStorage.setItem('sao-custom-bg', url);
      }
    } else {
      newMobile = url;
      setMobileBg(url);
      if (url === '/image.png' || !url) {
        localStorage.removeItem('sao-custom-bg-mobile');
      } else {
        localStorage.setItem('sao-custom-bg-mobile', url);
      }
    }

    dispatchUpdate();

    // Đồng bộ lên Backend (Database)
    try {
      await fetch('/api/user/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_wallpapers: {
            desktop: newDesktop === '/image.png' ? '' : newDesktop,
            mobile: newMobile,
            overlay_dim: dimLevel
          }
        })
      });
    } catch (err) {
      console.error('Failed to sync wallpapers to backend:', err);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError(t('settings.wallpaperUrlInvalid'));
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setUrlError(t('settings.wallpaperUrlPrefix'));
      return;
    }
    setUrlError('');
    applyWallpaper(trimmed);
  };

  const handleUploadSuccess = (url: string) => {
    setUrlError('');
    applyWallpaper(url);
  };

  const handleDimChange = async (val: number) => {
    setDimLevel(val);
    localStorage.setItem('sao-bg-overlay', String(val));
    dispatchUpdate();

    try {
      await fetch('/api/user/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_wallpapers: {
            desktop: desktopBg === '/image.png' ? '' : desktopBg,
            mobile: mobileBg,
            overlay_dim: val
          }
        })
      });
    } catch (err) {
      console.error('Failed to sync dim overlay to backend:', err);
    }
  };

  const handleReset = async () => {
    let newDesktop = desktopBg;
    let newMobile = mobileBg;

    if (deviceTab === 'desktop') {
      localStorage.removeItem('sao-custom-bg-desktop');
      localStorage.removeItem('sao-custom-bg');
      setDesktopBg('/image.png');
      newDesktop = '';
    } else {
      localStorage.removeItem('sao-custom-bg-mobile');
      setMobileBg('');
      newMobile = '';
    }

    setUrlInput('');
    setUrlError('');
    dispatchUpdate();

    try {
      await fetch('/api/user/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_wallpapers: {
            desktop: newDesktop,
            mobile: newMobile,
            overlay_dim: dimLevel
          }
        })
      });
    } catch (err) {
      console.error('Failed to sync reset to backend:', err);
    }
  };

  const isPresetActive = (url: string) => {
    if (deviceTab === 'desktop') {
      return desktopBg === url;
    }
    return mobileBg === url || (!mobileBg && desktopBg === url);
  };

  const isCustomActive = !activePresets.some(p => p.url === currentBg);

  return (
    <div className={styles.container}>
      {/* SECTION 0: DEVICE SELECTION (DESKTOP 16:9 VS MOBILE 9:16) */}
      <div className={styles.deviceSelectorCard}>
        <div className={styles.deviceSelectorHeader}>
          <div className={styles.deviceSelectorTitle}>
            <Sparkles size={16} className={styles.accentIcon} />
            <span>{t('settings.deviceTabsTitle')}</span>
          </div>
        </div>
        <div className={styles.deviceTabsRow}>
          <button
            type="button"
            className={`${styles.deviceTabBtn} ${deviceTab === 'desktop' ? styles.deviceTabBtnActive : ''}`}
            onClick={() => setDeviceTab('desktop')}
          >
            <Laptop size={18} />
            <span>{t('settings.deviceDesktop')}</span>
            {deviceTab === 'desktop' && <span className={styles.deviceTabPill}>16:9</span>}
          </button>
          <button
            type="button"
            className={`${styles.deviceTabBtn} ${deviceTab === 'mobile' ? styles.deviceTabBtnActive : ''}`}
            onClick={() => setDeviceTab('mobile')}
          >
            <Smartphone size={18} />
            <span>{t('settings.deviceMobile')}</span>
            {deviceTab === 'mobile' && <span className={styles.deviceTabPill}>9:16</span>}
          </button>
        </div>
      </div>

      {/* SECTION 1: SAO CURATED PRESETS */}
      <div className={styles.subSection}>
        <div className={styles.subHeader}>
          <div className={styles.subTitle}>
            <Sparkles size={16} className={styles.accentIcon} />
            <span>
              {t('settings.wallpaperPresets')} ({deviceTab === 'desktop' ? '16:9 Landscape' : '9:16 Portrait'})
            </span>
          </div>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleReset}
            title={t('settings.wallpaperReset')}
          >
            <RotateCcw size={14} />
            <span>{t('settings.wallpaperReset')}</span>
          </button>
        </div>

        <div className={styles.presetGrid}>
          {activePresets.map((preset) => {
            const active = isPresetActive(preset.url);
            return (
              <div
                key={preset.id}
                className={`${styles.presetCard} ${active ? styles.presetActive : ''}`}
                onClick={() => applyWallpaper(preset.url)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    applyWallpaper(preset.url);
                  }
                }}
              >
                <div
                  className={`${styles.presetThumb} ${deviceTab === 'mobile' ? styles.presetThumbMobile : ''}`}
                  style={{ backgroundImage: `url("${preset.previewUrl}")` }}
                >
                  <div className={styles.presetOverlay} />
                </div>
                <div className={styles.presetMeta}>
                  <div className={styles.presetName}>{t(preset.nameKey)}</div>
                  <div className={styles.presetDesc}>{t(preset.descKey)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: CUSTOM URL & UPLOAD */}
      <div className={styles.subSection}>
        <div className={styles.customGrid}>
          {/* URL Input Box */}
          <div className={styles.customBox}>
            <div className={styles.boxTitle}>
              <LinkIcon size={16} className={styles.accentIcon} />
              <span>{t('settings.wallpaperCustomUrl')}</span>
            </div>
            <div className={styles.urlInputRow}>
              <SaoInput
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (urlError) setUrlError('');
                }}
                placeholder={t('settings.wallpaperUrlPlaceholder')}
                className={styles.urlInput}
              />
              <SaoButton
                variant="primary"
                onClick={handleApplyUrl}
                disabled={!urlInput.trim()}
              >
                {t('settings.wallpaperApplyUrl')}
              </SaoButton>
            </div>
            {urlError && (
              <span className={styles.urlErrorText}>{urlError}</span>
            )}
          </div>

          {/* Upload Box */}
          <div className={styles.customBox}>
            <div className={styles.boxTitle}>
              <ImageIcon size={16} className={styles.accentIcon} />
              <span>{t('settings.wallpaperUpload')}</span>
            </div>
            <div className={styles.uploadRow}>
              <SaoImageUpload
                onUploadSuccess={handleUploadSuccess}
                label={`${t('settings.wallpaperUpload')} (${deviceTab === 'desktop' ? '16:9' : '9:16'})`}
                enableClipboardOption={true}
                variant="primary"
              />
            </div>
            <div className={styles.uploadNote}>
              {t('settings.wallpaperUploadDesc')}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: HUD DIMMING LEVEL & LIVE PREVIEW */}
      <div className={styles.subSection}>
        <div className={styles.dimmingLayout}>
          {/* Dimming Controls */}
          <div className={styles.dimmingControlBox}>
            <div className={styles.boxTitle}>
              <Sliders size={16} className={styles.accentIcon} />
              <span>{t('settings.wallpaperDimming')}</span>
              <span className={styles.dimValueBadge}>{Math.round(dimLevel * 100)}%</span>
            </div>
            <p className={styles.dimDesc}>{t('settings.wallpaperDimmingDesc')}</p>

            <div className={styles.dimPillRow}>
              {DIM_PRESETS.map((p) => {
                const active = Math.abs(dimLevel - p.value) < 0.04;
                return (
                  <button
                    key={p.value}
                    type="button"
                    className={`${styles.dimPill} ${active ? styles.dimPillActive : ''}`}
                    onClick={() => handleDimChange(p.value)}
                  >
                    {t(p.labelKey)}
                  </button>
                );
              })}
            </div>

            <div className={styles.sliderContainer}>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={dimLevel}
                onChange={(e) => handleDimChange(parseFloat(e.target.value))}
                className={styles.dimRange}
              />
              <div className={styles.rangeLabels}>
                <span>{t('settings.dimLabels.transparent')}</span>
                <span>{t('settings.dimLabels.standard')}</span>
                <span>{t('settings.dimLabels.oledDark')}</span>
              </div>
            </div>
          </div>

          {/* Live Preview Simulation Card */}
          <div className={styles.previewBox}>
            <div className={styles.boxTitle}>
              <Eye size={16} className={styles.accentIcon} />
              <span>
                {t('settings.wallpaperPreview')} ({deviceTab === 'desktop' ? '16:9 Laptop' : '9:16 Phone'})
              </span>
              {isCustomActive && (
                <span className={styles.customBadge}>{t('settings.wallpaperCustomActive')}</span>
              )}
            </div>

            <div
              className={`${styles.simStage} ${deviceTab === 'mobile' ? styles.simStageMobile : ''}`}
              style={{ backgroundImage: `url("${currentBg}")` }}
            >
              {deviceTab === 'mobile' && <div className={styles.mobileNotch} />}
              <div
                className={styles.simOverlay}
                style={{ backgroundColor: `rgba(0, 15, 30, ${dimLevel})` }}
              />
              <div className={styles.simCard}>
                <div className={styles.simCardHeader}>
                  <span className={styles.simDot} />
                  <span className={styles.simHudTitle}>
                    {deviceTab === 'mobile' ? 'SAO MOBILE HUD' : 'SAO SYSTEM HUD'}
                  </span>
                </div>
                <div className={styles.simBarTrack}>
                  <div className={styles.simBarFill} />
                </div>
                <div className={styles.simMetaRow}>
                  <span>HP: 8,450 / 10,000</span>
                  <span className={styles.simStatusOk}>ONLINE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
