import mongoose from 'mongoose';

export interface IBudget extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  category: string;
  month: string; // YYYY-MM
  limit: number;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new mongoose.Schema<IBudget>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  month: { type: String, required: true }, // e.g., '2023-10'
  limit: { type: Number, required: true, min: [0, 'Hạn mức không thể âm'] },
}, { timestamps: true });

if (mongoose.models.Budget) {
  delete mongoose.models.Budget;
}
export default mongoose.model<IBudget>('Budget', BudgetSchema);
