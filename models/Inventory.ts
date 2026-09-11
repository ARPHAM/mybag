import mongoose from 'mongoose';

export interface IInventory extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  category: string;
  quantity: number;
  originalQuantity: number;
  unit: string;
  purchaseDate?: Date;
  expiryDate?: Date;
  isGift: boolean;
  totalValue?: number;
  wallet_id?: mongoose.Types.ObjectId;
  walletName?: string;
  transaction_id?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new mongoose.Schema<IInventory>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  originalQuantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  purchaseDate: { type: Date },
  expiryDate: { type: Date },
  isGift: { type: Boolean, default: false },
  totalValue: { type: Number },
  wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  walletName: { type: String },
  transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
}, { timestamps: true });

if (mongoose.models.Inventory) {
  delete mongoose.models.Inventory;
}
export default mongoose.model<IInventory>('Inventory', InventorySchema);
