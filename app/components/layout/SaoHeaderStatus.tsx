"use client";

import { useState, useEffect, useRef } from 'react';
import { Sun, Clock, Brain, Utensils } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import SaoHeaderBridge from './SaoHeaderBridge';
import styles from './SaoHeaderStatus.module.css';

interface UserStatus {
  username: string;
  level: number;
  avatar_url?: string;
  current_hp: number;
  max_hp: number;
  current_mp: number;
  max_mp: number;
  overdueCount?: number;
}

interface Props {
  user: UserStatus | null;
}

export default function SaoHeaderStatus({ user }: Props) {
  const { t, formatDate, formatTime } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const [hp, setHp] = useState(user?.current_hp ?? 0);
  const [mp, setMp] = useState(user?.current_mp ?? 0);

  const prevUserRef = useRef<UserStatus | null>(null);
  useEffect(() => {
    if (user && user !== prevUserRef.current) {
      setHp(user.current_hp);
      setMp(user.current_mp);
      prevUserRef.current = user;
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());

      if (!user) return;

      setHp(prev => Math.max(0, prev - 50 / 3600));
      setMp(prev => {
        const overdue = user.overdueCount ?? 0;
        if (overdue > 0) {
          return Math.max(0, prev - (20 * overdue) / 3600);
        }
        return Math.min(user.max_mp ?? 500, prev + 30 / 3600);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user?.overdueCount, user?.max_mp]);

  const hpPct = user ? (hp / user.max_hp) * 100 : 100;
  const mpPct = user ? (mp / (user.max_mp ?? 500)) * 100 : 100;

  return (
    <>
      <div className={styles.headerLeftContainer}>
        <div className={styles.headerLeftTilted}>
          <div
            className={styles.avatarHex}
            style={user?.avatar_url ? { backgroundImage: `url(${user.avatar_url})` } : {}}
          />
          <div className={styles.userDetails}>
            <div className={styles.userName}>{user ? user.username : t('common.guest')}</div>
            <div className={styles.userLevel}>{t('common.level')} {user ? user.level : 1}</div>
          </div>
        </div>

        <div className={styles.headerLeftFlat}>
          <div className={styles.statusBars}>
            <div className={styles.barRow} title={`${t('common.hpLabel')} (HP)`}>
              <div className={`${styles.barLabel} ${styles.hp}`}>
                <Utensils size={15} /> HP
              </div>
              <div className={styles.barWrapper}>
                <div className={`${styles.barFill} ${styles.hp}`} style={{ width: `${hpPct}%` }} />
              </div>
              <div className={styles.barValues}>
                {user ? `${Math.floor(hp)} / ${user.max_hp}` : '0 / 0'}
              </div>
            </div>

            <div className={styles.barRow} title={`${t('common.mpLabel')} (MP)`}>
              <div className={`${styles.barLabel} ${styles.mp}`}>
                <Brain size={15} /> MP
              </div>
              <div className={styles.barWrapper}>
                <div className={`${styles.barFill} ${styles.mp}`} style={{ width: `${mpPct}%` }} />
              </div>
              <div className={styles.barValues}>
                {user ? `${Math.floor(mp)} / ${user.max_mp}` : '0 / 0'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SaoHeaderBridge />

      <div className={styles.headerRight}>
        <div className={styles.hrDecorTop} />
        <div className={styles.hrDecorBottom} />
        <div className={styles.hrDecorLeft} />

        <div className={styles.dateTime}>
          <div className={styles.weatherRow}>
            <Sun size={17} color="var(--sao-primary-hex, #00f0ff)" />
            <span>{t('common.today')}</span>
            <Clock size={17} color="var(--sao-primary-hex, #00f0ff)" style={{ marginLeft: 8 }} />
            <span className={styles.time} suppressHydrationWarning>{formatTime(now)}</span>
          </div>
          <div className={styles.date} suppressHydrationWarning>{formatDate(now)}</div>
        </div>
      </div>
    </>
  );
}
