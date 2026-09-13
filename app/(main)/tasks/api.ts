import axiosClient from '@/lib/axiosClient';

export const getTasks = () => {
  return axiosClient.get('/api/tasks');
};

export const updateTask = (id: string, updates: any) => {
  return axiosClient.patch(`/api/tasks/${id}`, updates);
};

export const deleteTask = (id: string) => {
  return axiosClient.delete(`/api/tasks/${id}`);
};

export const createTask = (taskData: any) => {
  return axiosClient.post('/api/tasks', taskData);
};
