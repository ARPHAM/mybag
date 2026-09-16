export type MenuTabId = 'recipes' | 'history';

export interface Recipe {
  _id: string;
  name: string;
  ingredients: string[];
}

export interface MealRecord {
  _id: string;
  consumed_at: string;
  meal_tier: 'HEAVY' | 'LIGHT' | 'DRINK';
  source: 'home' | 'eat_out';
  food_name: string;
  calo?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  sugar?: number;
  ai_status: 'pending' | 'completed' | 'failed';
  cost?: number;
  wallet_id?: string;
}
