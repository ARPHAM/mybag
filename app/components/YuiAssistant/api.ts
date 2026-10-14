import axiosClient from '@/lib/axiosClient';

export const parseYuiMessage = (text: string) => axiosClient.post('/api/ai/yui', { text });
export const executeYuiActions = (actions: any[]) => axiosClient.put('/api/ai/yui', { actions });
