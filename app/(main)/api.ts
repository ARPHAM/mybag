import axiosClient from '@/lib/axiosClient';

export const getUserProfile = () => {
  return axiosClient.get('/api/user/me');
};
