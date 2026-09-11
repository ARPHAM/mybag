import mongoose from 'mongoose';

export interface IDebtHistory {
  _id: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  type: 'pay_back' | 'borrow_more';
  walletName: string;
}

export interface IDebt extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  personName: string;
  type: 'lent' | 'borrowed';
  status: 'unpaid' | 'partial' | 'paid';
  totalAmount: number;
  remainingAmount: number;
  dueDate?: Date;
  completedDate?: Date;
  history: IDebtHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const DebtHistorySchema = new mongoose.Schema<IDebtHistory>({
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['pay_back', 'borrow_more'], required: true },
  walletName: { type: String, required: true }
});

const DebtSchema = new mongoose.Schema<IDebt>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  personName: { type: String, required: true },
  type: { type: String, enum: ['lent', 'borrowed'], required: true },
  status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  totalAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  dueDate: { type: Date },
  completedDate: { type: Date },
  history: [DebtHistorySchema]
}, { timestamps: true });

if (mongoose.models.Debt) {
  delete mongoose.models.Debt;
}
export default mongoose.model<IDebt>('Debt', DebtSchema);
