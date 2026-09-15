import axiosClient from '@/lib/axiosClient';

export const getUserProfile = (force = false) => {
  return axiosClient.get(`/api/user/me${force ? `?_t=${Date.now()}` : ''}`);
};
