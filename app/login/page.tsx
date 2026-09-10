"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email, password } 
      : { email, username, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      // Success - Redirect to Dashboard
      router.push('/');
      router.refresh();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>SAO SYSTEM</h1>
        <div className={styles.subtitle}>{isLogin ? 'Authenticating' : 'Character Creation'}</div>
        
        {error && <div className={styles.errorMessage}>[{error}]</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Tên Nhân Vật (Username)</label>
              <input 
                type="text" 
                className={styles.inputField} 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Email Truy Cập</label>
            <input 
              type="email" 
              className={styles.inputField}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Mật Khẩu Mạng (Password)</label>
            <input 
              type="password" 
              className={styles.inputField}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className={styles.linkStartBtn} disabled={isLoading}>
            {isLoading ? 'Processing...' : (isLogin ? 'Link Start' : 'Tạo Nhân Vật')}
          </button>
        </form>

        <div className={styles.toggleMode}>
          {isLogin ? (
            <span>Chưa có tài khoản? <span className={styles.toggleLink} onClick={() => setIsLogin(false)}>Đăng ký ngay</span></span>
          ) : (
            <span>Đã có tài khoản? <span className={styles.toggleLink} onClick={() => setIsLogin(true)}>Đăng nhập</span></span>
          )}
        </div>
      </div>
    </div>
  );
}
