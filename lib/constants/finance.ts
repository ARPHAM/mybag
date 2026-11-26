import { Activity, Wallet, CreditCard, Clock, Users, Package } from 'lucide-react';
import { FinanceTabId } from '../types';

export const FINANCE_CATEGORY_OPTIONS = [
  { value: 'food', label: 'Ăn uống' },
  { value: 'housing', label: 'Nhà cửa & Sinh hoạt' },
  { value: 'transport', label: 'Đi lại' },
  { value: 'shopping', label: 'Mua sắm' },
  { value: 'utilities', label: 'Đồ dùng' },
  { value: 'entertainment', label: 'Giải trí' },
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
  { value: 'spices', label: 'Gia vị' }
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
];

export function getFinanceTabs(t?: (key: any) => string): { id: FinanceTabId; label: string; icon: any }[] {
  if (!t) return FINANCE_TABS;
  return [
    { id: 'overview', label: t('finance.overviewTab'), icon: Activity },
    { id: 'wallets', label: t('finance.walletsTab'), icon: Wallet },
    { id: 'budgets', label: t('finance.budgetsTab'), icon: CreditCard },
    { id: 'history', label: t('finance.historyTab'), icon: Clock },
    { id: 'debts', label: t('finance.debtsTab'), icon: Users },
  ];
}

export function getFinanceCategoryOptions(t?: (key: any) => string) {
  if (!t) return FINANCE_CATEGORY_OPTIONS;
  return [
    { value: 'food', label: t('finance.categories.food') },
    { value: 'housing', label: t('finance.categories.housing') },
    { value: 'transport', label: t('finance.categories.transport') },
    { value: 'shopping', label: t('finance.categories.shopping') },
    { value: 'utilities', label: t('finance.categories.utilities') },
    { value: 'entertainment', label: t('finance.categories.entertainment') },
    { value: 'health', label: t('finance.categories.health') },
    { value: 'other', label: t('finance.categories.other') },
  ];
}

export function getWalletTypeOptions(t?: (key: any) => string) {
  if (!t) return WALLET_TYPE_OPTIONS;
  return [
    { value: 'bank', label: t('finance.walletTypes.bank') },
    { value: 'ewallet', label: t('finance.walletTypes.ewallet') },
    { value: 'cash', label: t('finance.walletTypes.cash') },
  ];
}

export function getInventoryCategoryOptions(t?: (key: any) => string) {
  if (!t) return INVENTORY_CATEGORY_OPTIONS;
  return [
    { value: 'food', label: t('finance.categories.food') },
    { value: 'spices', label: t('finance.categories.spices') },
  ];
}
