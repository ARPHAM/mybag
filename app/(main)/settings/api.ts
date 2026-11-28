import axiosClient from '@/lib/axiosClient';

export const logoutUser = () => axiosClient.post('/api/auth/logout');

export const updateUserPreferences = (prefs: {
  theme_color?: string;
  font_scale?: 'normal' | 'large' | 'xlarge';
}) => axiosClient.put('/api/user/me', prefs);
