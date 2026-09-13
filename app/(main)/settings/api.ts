import axiosClient from '@/lib/axiosClient';

export const logoutUser = () => axiosClient.post('/api/auth/logout');
