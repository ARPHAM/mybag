import axiosClient from '@/lib/axiosClient';

export const getHealthData = () => axiosClient.get('/api/health');
export const getHealthMacros = () => axiosClient.get('/api/health/macros');
export const getAiAnalysis = () => axiosClient.get('/api/health/ai-analysis');

export const saveHealthData = (data: any) => axiosClient.post('/api/health', data);
export const requestAiAnalysis = () => axiosClient.post('/api/health/ai-analysis');
