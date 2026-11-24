"use client";

import styles from './SaoHeaderBridge.module.css';

export default function SaoHeaderBridge() {
  return (
    <div className={styles.bridgeContainer} aria-hidden="true">
      {/* Cực nối bên trái (HUD Left Terminal) */}
      <div className={styles.terminalLeft}>
        <div className={styles.diamondNode} />
        <div className={styles.notchGroup}>
          <span className={styles.notch} />
          <span className={styles.notch} />
          <span className={styles.notch} />
        </div>
      </div>

      {/* Đường ray quang học trung tâm với luồng sáng chuyển động */}
      <div className={styles.railWrapper}>
        <div className={styles.railTrack} />
        <div className={styles.railGlow} />
        <div className={styles.pulseBeam} />

        {/* Holographic Badge trung tâm */}
        <div className={styles.telemetryBadge}>
          <span className={styles.bracketLeft}>[</span>
          <span className={styles.statusDot} />
          <span className={styles.telemetryText}>SYSTEM LINK // ACTIVE</span>
          <span className={styles.bracketRight}>]</span>
        </div>
      </div>

      {/* Cực nối bên phải (HUD Right Terminal) */}
      <div className={styles.terminalRight}>
        <div className={styles.notchGroup}>
          <span className={styles.notch} />
          <span className={styles.notch} />
          <span className={styles.notch} />
        </div>
        <div className={styles.diamondNode} />
      </div>
    </div>
  );
}
