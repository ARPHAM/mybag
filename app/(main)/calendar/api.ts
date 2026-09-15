import axiosClient from '@/lib/axiosClient';

export const getEvents = (start: string, end: string, force = false) => {
  return axiosClient.get(`/api/calendar?start=${start}&end=${end}${force ? `&_t=${Date.now()}` : ''}`);
};

export const createEvent = (data: any) => {
  return axiosClient.post('/api/calendar', data);
};

export const updateEvent = (id: string, data: any) => {
  return axiosClient.put(`/api/calendar/${id}`, data);
};

export const deleteEvent = (id: string, type: 'series' | 'exception', date?: string) => {
  const dateParam = date ? `&date=${date}` : '';
  return axiosClient.delete(`/api/calendar/${id}?type=${type}${dateParam}`);
};
