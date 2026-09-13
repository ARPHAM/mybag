import axiosClient from '@/lib/axiosClient';

export const getRecipes = () => axiosClient.get('/api/recipes');
export const getMeals = () => axiosClient.get('/api/meals');
export const getInventory = () => axiosClient.get('/api/finance/inventory');

export const calculateMacros = (payload: any) => axiosClient.post('/api/ai/calculate-macros', payload);

export const createRecipe = (recipeData: any) => axiosClient.post('/api/recipes', recipeData);

export const createMeal = (mealData: any) => axiosClient.post('/api/meals', mealData);
