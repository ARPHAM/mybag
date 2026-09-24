"use client";

import { useState, useEffect } from 'react';
import { User, Mail, Shield, Save, Loader2 } from 'lucide-react';
import SaoInput from '../../components/SaoInput/SaoInput';
import SaoButton from '../../components/SaoButton/SaoButton';
import SaoImageUpload from '../../components/SaoImageUpload/SaoImageUpload';
import { useSaoAlert } from '../../contexts/AlertContext';
import styles from './profile.module.css';

export default function ProfileDashboard() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    avatar_url: '',
    password: '',
    new_password: '',
    confirm_password: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { showAlert } = useSaoAlert();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setFormData(prev => ({
          ...prev,
          username: data.user.username,
          email: data.user.email,
          avatar_url: data.user.avatar_url || '',
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarUpload = (url: string) => {
    setFormData({ ...formData, avatar_url: url });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      showAlert('Mật khẩu xác nhận không khớp!');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          avatar_url: formData.avatar_url,
          password: formData.password,
          new_password: formData.new_password,
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert('Cập nhật hồ sơ thành công!');
        // Dispatch global event to update header avatar instantly
        window.dispatchEvent(new CustomEvent('sao-user-updated'));
        setFormData(prev => ({ ...prev, password: '', new_password: '', confirm_password: '' }));
      } else {
        showAlert(data.error || 'Cập nhật thất bại!');
      }
    } catch (err) {
      showAlert('Đã có lỗi xảy ra!');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <div className={styles.loadingState}><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <User className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>HỒ SƠ NHÂN VẬT</h1>
        </div>
      </div>
      
      <div className={styles.scrollContent}>
        <form onSubmit={handleSave} className={styles.profileForm}>
        {/* Avatar Section */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>Ảnh đại diện</div>
          <div className={styles.avatarRow}>
            <div 
              className={styles.avatarPreview} 
              style={{ backgroundImage: formData.avatar_url ? `url(${formData.avatar_url})` : 'none' }}
            >
              {!formData.avatar_url && <User size={40} opacity={0.5} />}
            </div>
            <div className={styles.uploadControls}>
              <p>Chọn ảnh vuông (1:1) để hiển thị đẹp nhất.</p>
              <SaoImageUpload label="Tải ảnh mới" onUploadSuccess={handleAvatarUpload} />
            </div>
          </div>
        </div>

        {/* Basic Info Section */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>Thông tin cơ bản</div>
          <div className={styles.formGroup}>
            <label><User size={16} /> Tên nhân vật (Username)</label>
            <SaoInput 
              name="username" 
              value={formData.username} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className={styles.formGroup}>
            <label><Mail size={16} /> Địa chỉ Email (Không thể đổi)</label>
            <SaoInput 
              name="email" 
              value={formData.email} 
              disabled 
            />
          </div>
        </div>

        {/* Security Section */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>Bảo mật & Mật khẩu</div>
          <div className={styles.formGroup}>
            <label><Shield size={16} /> Mật khẩu cũ (Chỉ nhập khi muốn đổi mật khẩu mới)</label>
            <SaoInput 
              name="password" 
              type="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="Để trống nếu không muốn đổi mật khẩu"
            />
          </div>
          
          {formData.password && (
            <>
              <div className={styles.formGroup}>
                <label>Mật khẩu mới</label>
                <SaoInput 
                  name="new_password" 
                  type="password" 
                  value={formData.new_password} 
                  onChange={handleChange} 
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Xác nhận mật khẩu mới</label>
                <SaoInput 
                  name="confirm_password" 
                  type="password" 
                  value={formData.confirm_password} 
                  onChange={handleChange} 
                  required
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.formActions}>
          <SaoButton variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            LƯU THAY ĐỔI
          </SaoButton>
        </div>
      </form>
      </div>
    </div>
  );
}
