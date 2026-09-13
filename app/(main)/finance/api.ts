import axiosClient from '@/lib/axiosClient';

export const getWallets = () => axiosClient.get('/api/finance/wallets');
export const getTransactions = () => axiosClient.get('/api/finance/transactions');
export const getBudgets = () => axiosClient.get('/api/finance/budgets');
export const getDebts = () => axiosClient.get('/api/finance/debts');
export const getInventory = () => axiosClient.get('/api/finance/inventory');

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
