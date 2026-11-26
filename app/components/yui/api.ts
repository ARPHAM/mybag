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

export const sendYuiReport = (payload: {
  user_message: string;
  yui_reply?: string;
  suggested_actions?: any[];
  expected_behavior: string;
  context_snapshot?: any;
}) => axiosClient.post('/api/ai/yui/report', payload);

export const getYuiReports = (status: string = 'pending') =>
  axiosClient.get(`/api/ai/yui/report?status=${status}`);
