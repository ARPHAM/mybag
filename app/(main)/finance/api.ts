import axiosClient from '@/lib/axiosClient';

export interface GetTransactionsParams {
  category?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  search?: string;
  sort?: 'date' | 'amount' | 'date_asc';
  limit?: number;
  force?: boolean;
}

export const getWallets = (force = false) => axiosClient.get(`/api/finance/wallets${force ? `?_t=${Date.now()}` : ''}`);

export const getTransactions = (paramsOrForce?: boolean | GetTransactionsParams) => {
  if (typeof paramsOrForce === 'boolean') {
    return axiosClient.get(`/api/finance/transactions${paramsOrForce ? `?_t=${Date.now()}` : ''}`);
  }
  if (!paramsOrForce) {
    return axiosClient.get('/api/finance/transactions');
  }
  const query = new URLSearchParams();
  if (paramsOrForce.category) query.set('category', paramsOrForce.category);
  if (paramsOrForce.startDate) query.set('startDate', paramsOrForce.startDate);
  if (paramsOrForce.endDate) query.set('endDate', paramsOrForce.endDate);
  if (paramsOrForce.type && paramsOrForce.type !== 'all') query.set('type', paramsOrForce.type);
  if (paramsOrForce.search) query.set('search', paramsOrForce.search);
  if (paramsOrForce.sort) query.set('sort', paramsOrForce.sort);
  if (paramsOrForce.limit) query.set('limit', paramsOrForce.limit.toString());
  if (paramsOrForce.force) query.set('_t', Date.now().toString());
  const qs = query.toString();
  return axiosClient.get(`/api/finance/transactions${qs ? `?${qs}` : ''}`);
};
export const getCategoryTransactions = (params: {
  category?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  sort?: 'date' | 'amount' | 'date_asc';
}) => {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.type) query.set('type', params.type);
  if (params.sort) query.set('sort', params.sort);
  return axiosClient.get(`/api/finance/transactions?${query.toString()}`);
};
export const getBudgets = (force = false) => axiosClient.get(`/api/finance/budgets${force ? `?_t=${Date.now()}` : ''}`);
export const getDebts = (force = false) => axiosClient.get(`/api/finance/debts${force ? `?_t=${Date.now()}` : ''}`);
export const getInventory = (force = false) => axiosClient.get(`/api/finance/inventory${force ? `?_t=${Date.now()}` : ''}`);

// CREATE
export const createWallet = (data: any) => axiosClient.post('/api/finance/wallets', data);
export const createTransaction = (data: any) => axiosClient.post('/api/finance/transactions', data);
export const createBudget = (data: any) => axiosClient.post('/api/finance/budgets', data);
export const createDebt = (data: any) => axiosClient.post('/api/finance/debts', data);
export const createInventory = (data: any) => axiosClient.post('/api/finance/inventory', data);

// UPDATE
export const updateWallet = (id: string, data: any) => axiosClient.put(`/api/finance/wallets/${id}`, data);
export const updateTransaction = (id: string, data: any) => axiosClient.put(`/api/finance/transactions/${id}`, data);
export const updateBudget = (id: string, data: any) => axiosClient.put(`/api/finance/budgets/${id}`, data);
export const updateDebt = (id: string, data: any) => axiosClient.put(`/api/finance/debts/${id}`, data);
export const updateInventory = (id: string, data: any) => axiosClient.put(`/api/finance/inventory/${id}`, data);

// DELETE
export const deleteWallet = (id: string) => axiosClient.delete(`/api/finance/wallets/${id}`);
export const deleteTransaction = (id: string) => axiosClient.delete(`/api/finance/transactions/${id}`);
export const deleteBudget = (id: string) => axiosClient.delete(`/api/finance/budgets/${id}`);
export const deleteDebt = (id: string) => axiosClient.delete(`/api/finance/debts/${id}`);
export const deleteInventory = (id: string) => axiosClient.delete(`/api/finance/inventory/${id}`);

// SMART EXPENSE AI
export const parseSmartExpense = (text: string) => axiosClient.post('/api/ai/smart-expense', { text });
export const executeSmartExpense = (actions: any[]) => axiosClient.put('/api/ai/smart-expense', { actions });
