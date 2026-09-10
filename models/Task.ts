import mongoose from 'mongoose';

export interface ITask extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  quest_rank: 'S' | 'A' | 'B' | 'C' | 'D';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  due_date: Date;
  completed_at?: Date;
  mp_penalty_applied: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new mongoose.Schema<ITask>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  quest_rank: { 
    type: String, 
    enum: ['S', 'A', 'B', 'C', 'D'], 
    required: true, 
    default: 'C' 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'], 
    required: true, 
    default: 'PENDING' 
  },
  due_date: { type: Date, required: true },
  completed_at: { type: Date },
  mp_penalty_applied: { type: Boolean, required: true, default: false },
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
