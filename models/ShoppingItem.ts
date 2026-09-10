import mongoose from 'mongoose';

export interface IShoppingItem extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unit: string;
  category: 'food' | 'household' | 'other';
  checked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShoppingItemSchema = new mongoose.Schema<IShoppingItem>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unit: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['food', 'household', 'other'], 
    required: true, 
    default: 'food' 
  },
  checked: { type: Boolean, required: true, default: false },
}, { timestamps: true });

export default mongoose.models.ShoppingItem || mongoose.model<IShoppingItem>('ShoppingItem', ShoppingItemSchema);
