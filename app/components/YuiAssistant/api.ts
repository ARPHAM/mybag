import axiosClient from '@/lib/axiosClient';

export const getYuiBriefing = () => axiosClient.get('/api/ai/yui');

export const parseYuiMessage = (text: string, history: any[] = [], imageData?: string) =>
  axiosClient.post('/api/ai/yui', {
    text,
    history,
    ...(imageData ? { imageData } : {})
  });

export const executeYuiActions = (actions: any[]) => axiosClient.put('/api/ai/yui', { actions });
