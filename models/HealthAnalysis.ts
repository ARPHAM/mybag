import mongoose from 'mongoose';

export interface IHealthAnalysis extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  analysis_text: string;
  analyzed_at: Date;
  start_date: Date;
  end_date: Date;
}

const HealthAnalysisSchema = new mongoose.Schema<IHealthAnalysis>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  analysis_text: { type: String, required: true },
  analyzed_at: { type: Date, required: true, default: Date.now },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true }
});

export default mongoose.models.HealthAnalysis || mongoose.model<IHealthAnalysis>('HealthAnalysis', HealthAnalysisSchema);
