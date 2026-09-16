import { Activity, Wallet, CreditCard, Clock, Users, Package } from 'lucide-react';
import { FinanceTabId } from '../types';

export const FINANCE_CATEGORY_OPTIONS = [
  { value: 'food', label: 'Ăn uống' },
  { value: 'housing', label: 'Nhà cửa & Sinh hoạt' },
  { value: 'transport', label: 'Đi lại' },
  { value: 'entertainment', label: 'Giải trí' },
  { value: 'shopping', label: 'Mua sắm' },
  { value: 'health', label: 'Sức khoẻ' },
  { value: 'other', label: 'Khác' }
];

export const WALLET_TYPE_OPTIONS = [
  { value: 'bank', label: 'Ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
  { value: 'cash', label: 'Tiền mặt' }
];

export const INVENTORY_CATEGORY_OPTIONS = [
  { value: 'food', label: 'Thực phẩm' },
  { value: 'spices', label: 'Gia vị' },
  { value: 'utilities', label: 'Đồ dùng' }
];

export const INVENTORY_UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'l', label: 'Lít (L)' },
  { value: 'ml', label: 'Mililít (ml)' },
  { value: 'thùng', label: 'Thùng' },
  { value: 'hộp', label: 'Hộp' },
  { value: 'gói', label: 'Gói' },
  { value: 'chai', label: 'Chai' },
  { value: 'quả', label: 'Quả' },
  { value: 'cái', label: 'Cái/Chiếc' },
  { value: 'phần', label: 'Phần' }
];

export const FINANCE_TABS: { id: FinanceTabId; label: string; icon: any }[] = [
  { id: 'overview', label: 'Tổng quan', icon: Activity },
  { id: 'wallets', label: 'Nguồn tiền', icon: Wallet },
  { id: 'budgets', label: 'Hạn mức', icon: CreditCard },
  { id: 'history', label: 'Lịch sử', icon: Clock },
  { id: 'debts', label: 'Sổ nợ', icon: Users },
  { id: 'inventory', label: 'Dự trữ', icon: Package },
];
