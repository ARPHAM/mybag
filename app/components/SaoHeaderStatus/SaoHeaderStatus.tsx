"use client";

import { useState, useEffect, useRef } from 'react';
import { Sun, Clock, Brain, Utensils } from 'lucide-react';
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
  const [now, setNow] = useState(() => new Date());
  const [hp, setHp] = useState(user?.current_hp ?? 0);
  const [mp, setMp] = useState(user?.current_mp ?? 0);

  // Sync with parent user prop when it changes (e.g. after fetch)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.overdueCount, user?.max_mp]);

  const formatDate = (date: Date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[date.getDay()]}, ${date.getDate()} Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const hpPct = user ? (hp / user.max_hp) * 100 : 100;
  const mpPct = user ? (mp / (user.max_mp ?? 500)) * 100 : 100;

  return (
    <>
      {/* Left: Avatar + HP/MP */}
      <div className={styles.headerLeftContainer}>
        <div className={styles.headerLeftTilted}>
          <div
            className={styles.avatarHex}
            style={user?.avatar_url ? { backgroundImage: `url(${user.avatar_url})` } : {}}
          />
          <div className={styles.userDetails}>
            <div className={styles.userName}>{user ? user.username : 'GUEST'}</div>
            <div className={styles.userLevel}>Level {user ? user.level : 1}</div>
          </div>
        </div>

        <div className={styles.headerLeftFlat}>
          <div className={styles.statusBars}>
            <div className={styles.barRow} title="Năng lượng (HP)">
              <div className={`${styles.barLabel} ${styles.hp}`}>
                <Utensils size={16} /> HP
              </div>
              <div className={styles.barWrapper}>
                <div className={`${styles.barFill} ${styles.hp}`} style={{ width: `${hpPct}%` }} />
              </div>
              <div className={styles.barValues}>
                {user ? `${Math.floor(hp)} / ${user.max_hp}` : '0 / 0'}
              </div>
            </div>

            <div className={styles.barRow} title="Tinh thần (MP)">
              <div className={`${styles.barLabel} ${styles.mp}`}>
                <Brain size={16} /> MP
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

      {/* Right: Clock */}
      <div className={styles.headerRight}>
        <div className={styles.hrDecorTop} />
        <div className={styles.hrDecorBottom} />
        <div className={styles.hrDecorLeft} />

        <div className={styles.dateTime}>
          <div className={styles.weatherRow}>
            <Sun size={18} color="var(--sao-primary-hex, #00f0ff)" />
            Today
            <Clock size={18} color="var(--sao-primary-hex, #00f0ff)" style={{ marginLeft: 10 }} />
            <span className={styles.time} suppressHydrationWarning>{formatTime(now)}</span>
          </div>
          <div className={styles.date} suppressHydrationWarning>{formatDate(now)}</div>
        </div>
      </div>
    </>
  );
}
