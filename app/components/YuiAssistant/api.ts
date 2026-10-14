import axiosClient from '@/lib/axiosClient';

export const parseYuiMessage = (text: string, history: any[] = []) =>
  axiosClient.post('/api/ai/yui', { text, history });
export const executeYuiActions = (actions: any[]) => axiosClient.put('/api/ai/yui', { actions });
