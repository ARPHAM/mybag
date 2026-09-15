import axiosClient from '@/lib/axiosClient';

export const getRecipes = (force = false) => axiosClient.get(`/api/recipes${force ? `?_t=${Date.now()}` : ''}`);
export const getMeals = (force = false) => axiosClient.get(`/api/meals${force ? `?_t=${Date.now()}` : ''}`);
export const getInventory = (force = false) => axiosClient.get(`/api/finance/inventory${force ? `?_t=${Date.now()}` : ''}`);

export const calculateMacros = (payload: any) => axiosClient.post('/api/ai/calculate-macros', payload);

export const createRecipe = (recipeData: any) => axiosClient.post('/api/recipes', recipeData);

export const createMeal = (mealData: any) => axiosClient.post('/api/meals', mealData);
export const updateMeal = (id: string, mealData: any) => axiosClient.put(`/api/meals/${id}`, mealData);
export const deleteMeal = (id: string) => axiosClient.delete(`/api/meals/${id}`);

export const getWallets = (force = false) => axiosClient.get(`/api/finance/wallets${force ? `?_t=${Date.now()}` : ''}`);
