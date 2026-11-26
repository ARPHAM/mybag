import axiosClient from '@/lib/axiosClient';
import { executeActionsViaStandardApis } from '@/lib/clientActionDispatcher';

export const getYuiBriefing = (lang: string = 'vi') => axiosClient.get(`/api/ai/yui?lang=${lang}`);

export const parseYuiMessage = (text: string, history: any[] = [], imageData?: string, lang: string = 'vi') =>
  axiosClient.post('/api/ai/yui', {
    text,
    history,
    lang,
    ...(imageData ? { imageData } : {})
  });

export const executeYuiActions = executeActionsViaStandardApis;
