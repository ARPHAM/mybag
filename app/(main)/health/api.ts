import axiosClient from '@/lib/axiosClient';

export const getHealthData = (force = false) => axiosClient.get(`/api/health${force ? `?_t=${Date.now()}` : ''}`);
export const getHealthMacros = (force = false) => axiosClient.get(`/api/health/macros${force ? `?_t=${Date.now()}` : ''}`);
export const getAiAnalysis = () => axiosClient.get('/api/health/ai-analysis');

export const saveHealthData = (data: any) => axiosClient.post('/api/health', data);
export const requestAiAnalysis = () => axiosClient.post('/api/health/ai-analysis');
