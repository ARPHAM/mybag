import mongoose from 'mongoose';

export interface IWeightLog extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  weight: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WeightLogSchema = new mongoose.Schema<IWeightLog>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weight: { type: Number, required: true },
  date: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.models.WeightLog || mongoose.model<IWeightLog>('WeightLog', WeightLogSchema);
