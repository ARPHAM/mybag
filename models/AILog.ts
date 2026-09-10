import mongoose from 'mongoose';

export interface IAILog extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  context: 'DAILY_GREETING' | 'TASK_ADVICE' | 'CHAT_BOT';
  content: string;
  timestamp: Date;
}

const AILogSchema = new mongoose.Schema<IAILog>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  context: { 
    type: String, 
    enum: ['DAILY_GREETING', 'TASK_ADVICE', 'CHAT_BOT'], 
    required: true 
  },
  content: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
});

export default mongoose.models.AILog || mongoose.model<IAILog>('AILog', AILogSchema);
