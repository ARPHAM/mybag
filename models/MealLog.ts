import mongoose from 'mongoose';

export interface IMealLog extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  food_name: string;
  meal_tier: 'HEAVY' | 'LIGHT' | 'DRINK';
  hp_restored: number;
  consumed_at: Date;
  calo?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  sugar?: number;
  cost?: number;
  ai_status: 'pending' | 'completed' | 'failed';
  recipe_id?: mongoose.Types.ObjectId;
  source: 'home' | 'eat_out';
  ingredients_text?: string;
  transaction_id?: mongoose.Types.ObjectId;
  wallet_id?: mongoose.Types.ObjectId;
  ingredients_used?: { invId: string, qty: number }[];
}

const MealLogSchema = new mongoose.Schema<IMealLog>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  food_name: { type: String, required: true },
  meal_tier: { 
    type: String, 
    enum: ['HEAVY', 'LIGHT', 'DRINK'], 
    required: true 
  },
  hp_restored: { type: Number, required: true },
  consumed_at: { type: Date, required: true, default: Date.now },
  calo: { type: Number },
  protein: { type: Number },
  fat: { type: Number },
  carbs: { type: Number },
  sugar: { type: Number },
  cost: { type: Number },
  ai_status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending' 
  },
  recipe_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
  source: { 
    type: String, 
    enum: ['home', 'eat_out'], 
    required: true,
    default: 'home'
  },
  ingredients_text: { type: String },
  transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  ingredients_used: [{
    invId: { type: String },
    qty: { type: Number }
  }]
});

export default mongoose.models.MealLog || mongoose.model<IMealLog>('MealLog', MealLogSchema);
