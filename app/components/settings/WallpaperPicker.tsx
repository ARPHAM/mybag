"use client";

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Link as LinkIcon,
  RotateCcw,
  Check,
  Eye,
  Sliders,
  Image as ImageIcon
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

const PRESETS: WallpaperPreset[] = [
  {
    id: 'aincrad',
    nameKey: 'settings.presets.aincrad.name',
    descKey: 'settings.presets.aincrad.desc',
    url: '/image.png',
    previewUrl: '/image.png'
  },
  {
    id: 'cyber_sao',
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
  const [currentBg, setCurrentBg] = useState<string>('/image.png');
  const [dimLevel, setDimLevel] = useState<number>(0.6);
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');

  useEffect(() => {
    const savedBg = localStorage.getItem('sao-custom-bg');
    if (savedBg) {
      setCurrentBg(savedBg);
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

  const applyWallpaper = (url: string) => {
    if (!url.trim()) return;
    setCurrentBg(url);
    if (url === '/image.png') {
      localStorage.removeItem('sao-custom-bg');
    } else {
      localStorage.setItem('sao-custom-bg', url);
    }
    dispatchUpdate();
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

  const handleDimChange = (val: number) => {
    setDimLevel(val);
    localStorage.setItem('sao-bg-overlay', String(val));
    dispatchUpdate();
  };

  const handleReset = () => {
    localStorage.removeItem('sao-custom-bg');
    localStorage.setItem('sao-bg-overlay', '0.6');
    setCurrentBg('/image.png');
    setDimLevel(0.6);
    setUrlInput('');
    setUrlError('');
    dispatchUpdate();
  };

  const isPresetActive = (url: string) => currentBg === url;
  const isCustomActive = !PRESETS.some(p => p.url === currentBg);

  return (
    <div className={styles.container}>
      {/* SECTION 1: SAO CURATED PRESETS */}
      <div className={styles.subSection}>
        <div className={styles.subHeader}>
          <div className={styles.subTitle}>
            <Sparkles size={16} className={styles.accentIcon} />
            <span>{t('settings.wallpaperPresets')}</span>
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
          {PRESETS.map((preset) => {
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
                  className={styles.presetThumb}
                  style={{ backgroundImage: `url("${preset.previewUrl}")` }}
                >
                  <div className={styles.presetOverlay} />
                  {active && (
                    <div className={styles.presetBadge}>
                      <Check size={14} />
                      <span>{t('settings.wallpaperActive')}</span>
                    </div>
                  )}
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
                label={t('settings.wallpaperUpload')}
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
              <span>{t('settings.wallpaperPreview')}</span>
              {isCustomActive && (
                <span className={styles.customBadge}>{t('settings.wallpaperCustomActive')}</span>
              )}
            </div>

            <div
              className={styles.simStage}
              style={{ backgroundImage: `url("${currentBg}")` }}
            >
              <div
                className={styles.simOverlay}
                style={{ backgroundColor: `rgba(0, 15, 30, ${dimLevel})` }}
              />
              <div className={styles.simCard}>
                <div className={styles.simCardHeader}>
                  <span className={styles.simDot} />
                  <span className={styles.simHudTitle}>SAO SYSTEM HUD</span>
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
