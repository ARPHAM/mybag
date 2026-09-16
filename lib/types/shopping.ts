export interface GroceryItem {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'food' | 'household' | 'other';
  checked: boolean;
}
