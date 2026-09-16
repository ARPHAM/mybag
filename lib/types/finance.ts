export type FinanceTabId = 'overview' | 'wallets' | 'budgets' | 'history' | 'debts' | 'inventory';

export interface WalletSource {
  id: string;
  name: string;
  balance: number;
  type: 'bank' | 'ewallet' | 'cash';
  color: string;
}

export interface BudgetPocket {
  id: string;
  name: string;
  month: string;
  category: string;
  limit: number;
  spent: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  wallet_id: string;
  walletName: string;
  to_wallet_id?: string;
  to_walletName?: string;
  date: string;
  description: string;
  category?: string;
}

export interface DebtRecord {
  id: string;
  date: string;
  amount: number;
  type: 'borrow_more' | 'pay_back';
  walletName: string;
  note?: string;
}

export interface DebtItem {
  id: string;
  personName: string;
  totalAmount: number;
  remainingAmount: number;
  type: 'lent' | 'borrowed';
  status: 'unpaid' | 'partial' | 'paid';
  dueDate: string;
  history: DebtRecord[];
  completedDate?: string;
}
