import axiosClient from '@/lib/axiosClient';

export interface GetMealsParams {
  days?: string | number;
  search?: string;
  startDate?: string;
  endDate?: string;
  force?: boolean;
}

export const getRecipes = (force = false) => axiosClient.get(`/api/recipes${force ? `?_t=${Date.now()}` : ''}`);
export const getMeals = (params?: GetMealsParams | boolean) => {
  if (typeof params === 'boolean') {
    return axiosClient.get(`/api/meals?days=7${params ? `&_t=${Date.now()}` : ''}`);
  }
  const searchParams = new URLSearchParams();
  if (params?.days) searchParams.set('days', String(params.days));
  else searchParams.set('days', '7');
  if (params?.search) searchParams.set('search', params.search);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.force) searchParams.set('_t', String(Date.now()));
  return axiosClient.get(`/api/meals?${searchParams.toString()}`);
};
export const getInventory = (force = false) => axiosClient.get(`/api/finance/inventory${force ? `?_t=${Date.now()}` : ''}`);
export const createInventory = (data: any) => axiosClient.post('/api/finance/inventory', data);
export const updateInventory = (id: string, data: any) => axiosClient.put(`/api/finance/inventory/${id}`, data);
export const deleteInventory = (id: string) => axiosClient.delete(`/api/finance/inventory/${id}`);

export const calculateMacros = (payload: any) => axiosClient.post('/api/ai/calculate-macros', payload);

export const createRecipe = (recipeData: any) => axiosClient.post('/api/recipes', recipeData);

export const createMeal = (mealData: any) => axiosClient.post('/api/meals', mealData);
export const updateMeal = (id: string, mealData: any) => axiosClient.put(`/api/meals/${id}`, mealData);
export const deleteMeal = (id: string) => axiosClient.delete(`/api/meals/${id}`);

export const createTransaction = (data: any) => axiosClient.post('/api/finance/transactions', data);

export const getWallets = (force = false) => axiosClient.get(`/api/finance/wallets${force ? `?_t=${Date.now()}` : ''}`);
