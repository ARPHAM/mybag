import axiosClient from '@/lib/axiosClient';

export const getShoppingItems = (force = false) => {
  return axiosClient.get(`/api/shopping${force ? `?_t=${Date.now()}` : ''}`);
};

export const createShoppingItem = (itemData: any) => {
  return axiosClient.post('/api/shopping', itemData);
};

export const updateShoppingItem = (id: string, updates: any) => {
  return axiosClient.put(`/api/shopping/${id}`, updates);
};

export const deleteShoppingItem = (id: string) => {
  return axiosClient.delete(`/api/shopping/${id}`);
};

export const purchaseShoppingItem = (
  id: string,
  payload: {
    amount?: number;
    wallet_id?: string;
    quantity?: number;
    unit?: string;
    addToInventory?: boolean;
    inventoryCategory?: 'food' | 'spices' | 'utilities';
    expiryDate?: string;
    isGift?: boolean;
  }
) => {
  return axiosClient.post(`/api/shopping/${id}/purchase`, payload);
};
