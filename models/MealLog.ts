import mongoose from 'mongoose';

export interface IMealLog extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  food_name: string;
  meal_tier: 'HEAVY' | 'LIGHT' | 'DRINK';
  hp_restored: number;
  consumed_at: Date;
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
});

export default mongoose.models.MealLog || mongoose.model<IMealLog>('MealLog', MealLogSchema);
