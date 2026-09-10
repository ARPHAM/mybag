import mongoose from 'mongoose';

export interface IWallet extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  balance: number;
  type: 'bank' | 'ewallet' | 'cash';
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new mongoose.Schema<IWallet>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  balance: { type: Number, required: true, default: 0, min: [0, 'Số dư không được âm'] },
  type: { type: String, enum: ['bank', 'ewallet', 'cash'], required: true },
  color: { type: String, required: true, default: '#0055ff' }
}, { timestamps: true });

// Prevent caching in dev
if (mongoose.models.Wallet) {
  delete mongoose.models.Wallet;
}
export default mongoose.model<IWallet>('Wallet', WalletSchema);
