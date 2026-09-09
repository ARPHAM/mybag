"use client";

import { useState, useEffect } from 'react';
import { Settings, Palette, CheckCircle2 } from 'lucide-react';
import styles from './settings.module.css';

const THEMES = [
  { id: 'cyan', name: 'Mặc định', desc: 'Xanh Neon chuẩn phong cách hệ thống (SAO)', color: '#00f0ff' },
  { id: 'yellow', name: 'Cảnh Báo', desc: 'Vàng rực rỡ, kích thích sự tập trung', color: '#ffaa00' },
  { id: 'red', name: 'Huyết Đoạt', desc: 'Đỏ thẫm nguy hiểm, dùng khi cần kỷ luật', color: '#ff4444' },
  { id: 'green', name: 'Hồi Sinh', desc: 'Xanh ngọc êm dịu, thân thiện với mắt', color: '#00ffaa' },
  { id: 'purple', name: 'Hư Không', desc: 'Tím mộng mơ, quyền lực bóng tối', color: '#b900ff' },
  { id: 'magenta', name: 'Ảo Ảnh', desc: 'Hồng dạ quang phá cách, nổi loạn', color: '#ff00ff' },
  { id: 'orange', name: 'Hỏa Ngục', desc: 'Cam cháy bỏng, năng lượng tràn trề', color: '#ff5500' },
  { id: 'white', name: 'Bạch Kim', desc: 'Trắng tinh khiết, thanh lịch tối giản', color: '#ffffff' },
];

export default function SettingsPage() {
  const [activeTheme, setActiveTheme] = useState('cyan');

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

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Settings className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>Cài Đặt Hệ Thống</h1>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <Palette size={20} />
          <span>Chủ đề màu sắc (Global Theme)</span>
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
              <div className={styles.themeName}>{theme.name}</div>
              <div className={styles.themeDesc}>{theme.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
