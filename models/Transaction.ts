import mongoose from 'mongoose';

export interface ITransaction extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: Date;
  description: string;
  category?: string;                        // Phân loại (để map với Budget)
  wallet_id?: mongoose.Types.ObjectId;      // Used for income/expense, or source for transfer
  to_wallet_id?: mongoose.Types.ObjectId;   // Used only for transfer destination
  walletName: string;                       // Stored snapshot name (e.g. "MB Bank" or "MB Bank -> Momo")
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new mongoose.Schema<ITransaction>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
  amount: { type: Number, required: true, min: [1, 'Số tiền phải lớn hơn 0'] },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, required: true },
  category: { type: String },
  wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  to_wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  walletName: { type: String, required: true }
}, { timestamps: true });

if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}
export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
