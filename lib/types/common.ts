export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  originalQuantity?: number;
  purchaseDate?: string;
  expiryDate?: string;
  category?: 'food' | 'spices' | 'utilities' | string;
  totalValue?: number;
  isGift?: boolean;
  wallet_id?: string;
  walletName?: string;
}
