import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  username: string;
  email: string;
  password_hash: string;
  level: number;
  current_exp: number;
  max_hp: number;
  current_hp: number;
  max_mp: number;
  current_mp: number;
  height: number;
  last_active_at: Date;
  ai_daily_buff?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  level: { type: Number, required: true, default: 1 },
  current_exp: { type: Number, required: true, default: 0 },
  max_hp: { type: Number, required: true, default: 2000 },
  current_hp: { type: Number, required: true, default: 2000 },
  max_mp: { type: Number, required: true, default: 1000 },
  current_mp: { type: Number, required: true, default: 1000 },
  height: { type: Number, required: true, default: 170 },
  last_active_at: { type: Date, required: true, default: Date.now },
  ai_daily_buff: { type: String },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
