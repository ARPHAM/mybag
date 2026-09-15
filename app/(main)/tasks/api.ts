import axiosClient from '@/lib/axiosClient';

export const getTasks = (force = false) => {
  return axiosClient.get(`/api/tasks${force ? `?_t=${Date.now()}` : ''}`);
};

export const updateTask = (id: string, updates: any) => {
  return axiosClient.put(`/api/tasks/${id}`, updates);
};

export const deleteTask = (id: string) => {
  return axiosClient.delete(`/api/tasks/${id}`);
};

export const createTask = (taskData: any) => {
  return axiosClient.post('/api/tasks', taskData);
};
