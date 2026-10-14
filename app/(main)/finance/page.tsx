"use client";

import { useState, useEffect } from 'react';
import { Wallet, Plus, Activity, Save, Trash2, ArrowRightLeft, RotateCcw, Sparkles } from 'lucide-react';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoSelect from '../../components/SaoSelect/SaoSelect';
import SaoTabs from '../../components/SaoTabs/SaoTabs';
import SaoDatePicker from '../../components/SaoDatePicker/SaoDatePicker';
import SaoLoading from '../../components/SaoLoading/SaoLoading';
import SaoInput from '../../components/SaoInput/SaoInput';
import SaoButton from '../../components/SaoButton/SaoButton';
import { useSaoAlert } from '../../contexts/AlertContext';

import { getWallets, getTransactions, getBudgets, getDebts, getInventory, createWallet, createTransaction, createBudget, createDebt, createInventory, updateWallet, updateTransaction, updateBudget, updateDebt, updateInventory, deleteWallet, deleteTransaction, deleteBudget, deleteDebt, deleteInventory } from './api';
import styles from './finance.module.css';

import {
  FinanceTabId,
  WalletSource,
  BudgetPocket,
  Transaction,
  DebtRecord,
  DebtItem,
  InventoryItem
} from '@/lib/types';
import {
  FINANCE_CATEGORY_OPTIONS,
  WALLET_TYPE_OPTIONS,
  INVENTORY_CATEGORY_OPTIONS,
  INVENTORY_UNIT_OPTIONS,
  FINANCE_TABS
} from '@/lib/constants';

// Tab components
import OverviewTab from './components/OverviewTab';
import WalletsTab from './components/WalletsTab';
import HistoryTab from './components/HistoryTab';
import BudgetsTab from './components/BudgetsTab';
import DebtsTab from './components/DebtsTab';
import InventoryTab from './components/InventoryTab';
import SmartExpenseModal from './components/SmartExpenseModal';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTabId>('overview');
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);

  const [wallets, setWallets] = useState<WalletSource[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetPocket[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [walletForm, setWalletForm] = useState({ name: '', type: 'bank', color: '#00f0ff', balance: '' });
  const [txForm, setTxForm] = useState({ type: 'expense', amount: '', date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], description: '', wallet_id: '', to_wallet_id: '', category: 'food' });
  const [budgetForm, setBudgetForm] = useState({ name: '', month: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7), category: 'food', limit: '' });
  const [debtForm, setDebtForm] = useState({ personName: '', type: 'lent', status: 'unpaid', amount: '', dueDate: '', wallet_id: '' });
  const [debtActionForm, setDebtActionForm] = useState({ amount: '', wallet_id: '', date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] });
  const [inventoryForm, setInventoryForm] = useState({ name: '', category: 'food', purchaseDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], expiryDate: '', quantity: '', unit: '', isGift: false, totalValue: '', wallet_id: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'wallets' | 'transaction' | 'budgets' | 'debts' | 'debt_action' | 'inventory' | 'history' | 'scan_bill_review'>('transaction');
  const [editingItem, setEditingItem] = useState<any>(null);

  const [isScanningBill, setIsScanningBill] = useState(false);
  const [scannedBillItems, setScannedBillItems] = useState<any[]>([]);
  const [billWalletId, setBillWalletId] = useState('');
  const [debtActionType, setDebtActionType] = useState<'borrow_more' | 'pay_back' | null>(null);
  const [isInventoryFabExpanded, setIsInventoryFabExpanded] = useState(false);

  const closeModal = () => setIsModalOpen(false);
  const { showAlert, showConfirm } = useSaoAlert();

  useEffect(() => {
    fetchData();
    const handleFinanceUpdate = () => fetchData(true);
    window.addEventListener('sao-finance-updated', handleFinanceUpdate);
    return () => window.removeEventListener('sao-finance-updated', handleFinanceUpdate);
  }, []);

  const fetchData = async (force = false) => {
    setIsLoading(true);
    try {
      const [wData, tData, bData, dData]: any = await Promise.all([
        getWallets(force),
        getTransactions(force),
        getBudgets(force),
        getDebts(force)
      ]);

      if (wData) {
        setWallets(wData.map((w: any) => ({
          id: w._id,
          name: w.name,
          balance: w.balance,
          type: w.type,
          color: w.color
        })));
      }
      if (tData) {
        setTransactions(tData.map((t: any) => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          date: t.date.split('T')[0],
          description: t.description,
          walletName: t.walletName,
          wallet_id: t.wallet_id,
          to_wallet_id: t.to_wallet_id,
          category: t.category
        })));
      }
      if (bData) {
        setBudgets(bData.map((b: any) => ({
          id: b._id,
          name: b.name,
          category: b.category,
          month: b.month,
          limit: b.limit,
          spent: b.spent
        })));
      }
      if (dData) {
        setDebts(dData.map((d: any) => ({
          id: d._id,
          personName: d.personName,
          type: d.type,
          status: d.status,
          totalAmount: d.totalAmount,
          remainingAmount: d.remainingAmount,
          dueDate: d.dueDate ? d.dueDate.split('T')[0] : undefined,
          completedDate: d.completedDate ? d.completedDate.split('T')[0] : undefined,
          history: d.history.map((h: any) => ({
            id: h._id,
            date: h.date.split('T')[0],
            amount: h.amount,
            type: h.type,
            walletName: h.walletName
          }))
        })));
      }

      const iData: any = await getInventory(force);
      if (iData) {
        setInventory(iData.map((i: any) => ({
          id: i._id,
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          originalQuantity: i.originalQuantity,
          unit: i.unit,
          purchaseDate: i.purchaseDate ? i.purchaseDate.split('T')[0] : undefined,
          expiryDate: i.expiryDate ? i.expiryDate.split('T')[0] : undefined,
          isGift: i.isGift,
          totalValue: i.totalValue,
          wallet_id: i.wallet_id,
          walletName: i.walletName
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    showConfirm('Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ được tính toán hoàn trả tương ứng.', async () => {
      try {
        await deleteTransaction(id);
        fetchData(true);
        if (isModalOpen) setIsModalOpen(false);
      } catch (err: any) {
        console.error(err);
        showAlert(err.message || 'Lỗi hệ thống');
      }
    });
  };

  const updateInventoryQty = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newQty = Math.max(0, item.quantity + delta);
    setInventory(inventory.map(i => i.id === id ? { ...i, quantity: newQty } : i));

    try {
      await updateInventory(id, { justUpdateQty: true, quantity: newQty });
    } catch (err) {
      console.error('Lỗi khi cập nhật số lượng', err);
      fetchData(true);
    }
  };

  const handleScanBill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningBill(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        try {
          const res = await fetch('/api/ai/scan-bill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_data: base64data })
          });
          const data = await res.json();
          if (data && data.items) {
            const items = data.items.map((item: any, index: number) => ({
              ...item,
              id: index,
              isGift: false,
              keep: true,
            }));
            setScannedBillItems(items);
            setBillWalletId('');
            openModal('scan_bill_review');
          } else {
            showAlert(data.error || 'Lỗi quét hóa đơn');
          }
        } catch (err) {
          console.error(err);
          showAlert('Lỗi gọi API AI');
        } finally {
          setIsScanningBill(false);
          e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      showAlert('Lỗi đọc file hóa đơn');
      setIsScanningBill(false);
      e.target.value = '';
    }
  };

  const handleSaveScannedBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToSave = scannedBillItems.filter(i => i.keep);

    const needsWallet = itemsToSave.some(i => !i.isGift && (i.price > 0));
    if (needsWallet && !billWalletId) {
      showAlert('Vui lòng chọn nguồn tiền thanh toán cho hóa đơn này.');
      return;
    }

    try {
      for (const item of itemsToSave) {
        const isFoodType = item.category === 'food';

        if (isFoodType) {
          await createInventory({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit || 'cái',
            purchaseDate: new Date().toISOString(),
            isGift: item.isGift,
            totalValue: item.price,
            wallet_id: (!item.isGift && item.price > 0) ? billWalletId : undefined
          });
        } else {
          if (!item.isGift && item.price > 0) {
            await createTransaction({
              type: 'expense',
              amount: item.price,
              date: new Date().toISOString(),
              description: `Mua sắm: ${item.name}`,
              category: item.category,
              wallet_id: billWalletId
            });
          }
        }
      }

      closeModal();
      fetchData(true);
    } catch (error) {
      console.error(error);
      showAlert('Có lỗi xảy ra khi lưu một số mặt hàng.');
    }
  };

  const openModal = (type: 'wallets' | 'transaction' | 'budgets' | 'debts' | 'debt_action' | 'inventory' | 'history' | 'scan_bill_review', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'wallets') {
      setWalletForm(item ? { name: item.name, type: item.type, color: item.color, balance: item.balance.toString() } : { name: '', type: 'bank', color: '#00f0ff', balance: '' });
    }
    if (type === 'transaction' || type === 'history') {
      let formattedDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      if (item && item.date) {
        formattedDate = new Date(new Date(item.date).getTime() - new Date(item.date).getTimezoneOffset() * 60000).toISOString().split('T')[0];
      }
      setTxForm(item ? {
        type: item.type, amount: item.amount.toString(), wallet_id: item.wallet_id || '', to_wallet_id: item.to_wallet_id || '', date: formattedDate, description: item.description, category: item.category || 'food'
      } : {
        type: 'expense', amount: '', wallet_id: '', to_wallet_id: '', date: formattedDate, description: '', category: 'food'
      });
    }
    if (type === 'budgets') {
      setBudgetForm(item ? {
        name: item.name, month: item.month, category: item.category, limit: item.limit.toString()
      } : {
        name: '', month: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7), category: 'food', limit: ''
      });
    }
    if (type === 'debts') {
      setDebtForm(item ? {
        personName: item.personName, type: item.type, status: item.status, amount: item.totalAmount?.toString(), dueDate: item.dueDate || '', wallet_id: ''
      } : {
        personName: '', type: 'lent', status: 'unpaid', amount: '', dueDate: '', wallet_id: ''
      });
    }
    if (type === 'inventory') {
      setInventoryForm(item ? {
        name: item.name, category: item.category, purchaseDate: item.purchaseDate || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], expiryDate: item.expiryDate || '',
        quantity: item.quantity?.toString(), unit: item.unit, isGift: item.isGift,
        totalValue: item.totalValue?.toString() || '', wallet_id: item.wallet_id || ''
      } : {
        name: '', category: 'food', purchaseDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], expiryDate: '', quantity: '', unit: '', isGift: false, totalValue: '', wallet_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const openDebtActionModal = (debt: DebtItem, action: 'borrow_more' | 'pay_back') => {
    setModalType('debt_action');
    setEditingItem(debt);
    setDebtActionType(action);
    setDebtActionForm({ amount: '', wallet_id: '', date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const formatMoney = (amount: number) =>
    amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const renderModalContent = () => {
    const handleSaveBudget = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const reqData = {
          name: budgetForm.name,
          month: budgetForm.month,
          category: budgetForm.category,
          limit: parseFloat(budgetForm.limit) || 0
        };
        if (editingItem) {
          await updateBudget(editingItem.id, reqData);
        } else {
          await createBudget(reqData);
        }
        fetchData(true);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error(err);
        showAlert(err.message || 'Lỗi lưu hạn mức');
      }
    };

    const handleSaveDebt = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const reqData = {
          personName: debtForm.personName,
          type: debtForm.type,
          status: debtForm.status,
          amount: parseFloat(debtForm.amount) || 0,
          dueDate: debtForm.dueDate,
          wallet_id: debtForm.wallet_id
        };
        if (editingItem) {
          await updateDebt(editingItem.id, reqData);
        } else {
          await createDebt(reqData);
        }
        fetchData(true);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error(err);
        showAlert(err.message || 'Lỗi lưu sổ nợ');
      }
    };

    const handleSaveDebtAction = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItem || !debtActionType) return;
      try {
        await updateDebt(editingItem.id, {
          action: debtActionType,
          actionAmount: parseFloat(debtActionForm.amount) || 0,
          wallet_id: debtActionForm.wallet_id,
          date: debtActionForm.date
        });
        fetchData(true);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error(err);
        showAlert(err.message || 'Lỗi giao dịch nợ');
      }
    };

    const handleSaveInventory = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const reqData = {
          name: inventoryForm.name,
          category: inventoryForm.category,
          quantity: parseFloat(inventoryForm.quantity) || 0,
          unit: inventoryForm.unit,
          purchaseDate: inventoryForm.purchaseDate,
          expiryDate: inventoryForm.expiryDate,
          isGift: inventoryForm.isGift,
          totalValue: parseFloat(inventoryForm.totalValue) || 0,
          wallet_id: inventoryForm.wallet_id
        };
        if (editingItem) {
          await updateInventory(editingItem.id, reqData);
        } else {
          await createInventory(reqData);
        }
        fetchData(true);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error(err);
        showAlert(err.message || 'Lỗi lưu kho');
      }
    };

    const handleDeleteBudget = async (id: string) => {
      showConfirm('Bạn có chắc muốn xóa hạn mức này?', async () => {
        try {
          await deleteBudget(id);
          fetchData(true);
          if (isModalOpen) setIsModalOpen(false);
        } catch (e: any) {
          showAlert(e.message || 'Lỗi xóa hạn mức');
        }
      });
    };

    const handleDeleteDebt = async (id: string) => {
      showConfirm('Bạn có chắc muốn xóa sổ nợ này? Lưu ý: Xóa sổ nợ sẽ không hoàn lại các giao dịch đã ghi nhận trong ví.', async () => {
        try {
          await deleteDebt(id);
          fetchData(true);
          if (isModalOpen) setIsModalOpen(false);
        } catch (e: any) {
          showAlert(e.message || 'Lỗi xóa sổ nợ');
        }
      });
    };

    const handleDeleteInventory = async (id: string) => {
      showConfirm('Bạn có chắc muốn xóa mặt hàng này khỏi kho? Số tiền mua hàng sẽ được hoàn lại vào ví nếu có.', async () => {
        try {
          await deleteInventory(id);
          fetchData(true);
          if (isModalOpen) setIsModalOpen(false);
        } catch (e: any) {
          showAlert(e.message || 'Lỗi xóa hàng tồn');
        }
      });
    };

    const handleSaveWallet = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const reqData = {
          name: walletForm.name,
          type: walletForm.type,
          color: walletForm.color,
          balance: parseFloat(walletForm.balance) || 0
        };
        if (editingItem) {
          await updateWallet(editingItem.id, reqData);
        } else {
          await createWallet(reqData);
        }
        fetchData(true);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error(err);
        showAlert(err.message || 'Lỗi lưu nguồn tiền');
      }
    };

    const handleSaveTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const reqData = {
          type: txForm.type,
          amount: parseFloat(txForm.amount) || 0,
          date: txForm.date,
          description: txForm.description,
          category: txForm.type === 'expense' ? txForm.category : undefined,
          wallet_id: txForm.wallet_id,
          to_wallet_id: txForm.to_wallet_id
        };
        if (editingItem) {
          await updateTransaction(editingItem.id, reqData);
        } else {
          await createTransaction(reqData);
        }
        fetchData(true);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error(err);
        showAlert(err.message || 'Lỗi lưu giao dịch');
      }
    };

    if (modalType === 'transaction' || modalType === 'history') {
      return (
        <form onSubmit={handleSaveTransaction}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Loại giao dịch</label>
              <div className={styles.formRadioGroup}>
                <label className={styles.formRadioLabel}>
                  <input type="radio" name="type" checked={txForm.type === 'expense'} onChange={() => setTxForm({ ...txForm, type: 'expense' })} /> Chi tiêu
                </label>
                <label className={styles.formRadioLabel}>
                  <input type="radio" name="type" checked={txForm.type === 'income'} onChange={() => setTxForm({ ...txForm, type: 'income' })} /> Thu nhập
                </label>
                <label className={styles.formRadioLabel}>
                  <input type="radio" name="type" checked={txForm.type === 'transfer'} onChange={() => setTxForm({ ...txForm, type: 'transfer' })} /> Chuyển khoản
                </label>
              </div>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số tiền (VND)</label>
              <SaoInput type="number" placeholder="Nhập số tiền..." value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} required />
            </div>
            {txForm.type === 'expense' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Danh mục</label>
                <SaoSelect
                  initialValue={txForm.category}
                  options={FINANCE_CATEGORY_OPTIONS}
                  onChange={v => setTxForm({ ...txForm, category: v })}
                />
              </div>
            )}
          </div>

          {txForm.type === 'transfer' ? (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Từ nguồn tiền (Trừ)</label>
                <SaoSelect
                  initialValue={txForm.wallet_id}
                  placeholder="Chọn nguồn tiền gửi"
                  options={wallets.map(w => ({ value: w.id, label: `${w.name} (${formatMoney(w.balance)})` }))}
                  onChange={v => setTxForm({ ...txForm, wallet_id: v })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Đến nguồn tiền (Cộng)</label>
                <SaoSelect
                  initialValue={txForm.to_wallet_id}
                  placeholder="Chọn nguồn tiền nhận"
                  options={wallets.map(w => ({ value: w.id, label: w.name }))}
                  onChange={v => setTxForm({ ...txForm, to_wallet_id: v })}
                />
              </div>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nguồn tiền</label>
              <SaoSelect
                initialValue={txForm.wallet_id}
                placeholder="Chọn nguồn tiền"
                options={wallets.map(w => ({ value: w.id, label: `${w.name} (${formatMoney(w.balance)})` }))}
                onChange={v => setTxForm({ ...txForm, wallet_id: v })}
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ngày giao dịch</label>
            <SaoDatePicker value={txForm.date} onChange={v => setTxForm({ ...txForm, date: v })} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Diễn giải</label>
            <SaoInput isTextarea placeholder="Nhập diễn giải..." value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} required></SaoInput>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <SaoButton variant="primary" type="submit">
              <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thêm giao dịch'}
            </SaoButton>
            {editingItem && (
              <SaoButton variant="danger" type="button" onClick={() => handleDeleteTransaction(editingItem.id)}>
                <Trash2 size={18} style={{ display: 'inline', marginRight: 8 }} /> Xóa
              </SaoButton>
            )}
          </div>
        </form>
      );
    }

    if (modalType === 'wallets') {
      return (
        <form onSubmit={handleSaveWallet}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tên nguồn tiền</label>
            <SaoInput type="text" placeholder="VD: Vietcombank, Tiền mặt..." value={walletForm.name} onChange={e => setWalletForm({ ...walletForm, name: e.target.value })} required />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Loại</label>
              <SaoSelect
                initialValue={walletForm.type}
                options={WALLET_TYPE_OPTIONS}
                onChange={v => setWalletForm({ ...walletForm, type: v })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Màu sắc (Theme)</label>
              <SaoInput type="color" style={{ padding: '0 5px' }} value={walletForm.color} onChange={e => setWalletForm({ ...walletForm, color: e.target.value })} required />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Số dư ban đầu (VND)</label>
            <SaoInput type="number" placeholder="0" value={walletForm.balance} onChange={e => setWalletForm({ ...walletForm, balance: e.target.value })} />
          </div>
          <SaoButton variant="primary" type="submit">
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thêm nguồn tiền'}
          </SaoButton>
        </form>
      );
    }

    if (modalType === 'budgets') {
      return (
        <form onSubmit={handleSaveBudget}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tên hạn mức (Túi chi tiêu)</label>
            <SaoInput type="text" placeholder="VD: Ăn uống, Giải trí..." value={budgetForm.name} onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })} required />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tháng áp dụng</label>
              <SaoInput type="month" value={budgetForm.month} onChange={e => setBudgetForm({ ...budgetForm, month: e.target.value })} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Icon / Danh mục</label>
              <SaoSelect
                initialValue={budgetForm.category}
                options={FINANCE_CATEGORY_OPTIONS}
                onChange={v => setBudgetForm({ ...budgetForm, category: v })}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Số tiền giới hạn (VND)</label>
            <SaoInput type="number" placeholder="VD: 5000000" value={budgetForm.limit} onChange={e => setBudgetForm({ ...budgetForm, limit: e.target.value })} required />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <SaoButton variant="primary" type="submit">
              <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thiết lập hạn mức'}
            </SaoButton>
            {editingItem && (
              <SaoButton variant="danger" type="button" onClick={() => handleDeleteBudget(editingItem.id)}>
                <Trash2 size={18} style={{ display: 'inline', marginRight: 8 }} /> Xóa
              </SaoButton>
            )}
          </div>
        </form>
      );
    }

    if (modalType === 'debt_action') {
      const isBorrowMore = debtActionType === 'borrow_more';
      const titleLabel = isBorrowMore
        ? (editingItem?.type === 'lent' ? 'Cho Vay Thêm' : 'Vay Thêm')
        : (editingItem?.type === 'lent' ? 'Thu Nợ' : 'Trả Nợ');

      return (
        <form onSubmit={handleSaveDebtAction}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Giao dịch với: <span style={{ color: '#fff' }}>{editingItem?.personName}</span></label>
            <div style={{ padding: '10px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', color: '#00f0ff', margin: '5px 0 15px' }}>
              Hành động: <strong>{titleLabel}</strong>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số tiền (VND)</label>
              <SaoInput type="number" placeholder="VD: 500000" value={debtActionForm.amount} onChange={e => setDebtActionForm({ ...debtActionForm, amount: e.target.value })} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nguồn tiền</label>
              <SaoSelect
                initialValue={debtActionForm.wallet_id}
                placeholder="Chọn nguồn tiền..."
                options={wallets.map(w => ({ value: w.id, label: w.name }))}
                onChange={v => setDebtActionForm({ ...debtActionForm, wallet_id: v })}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ngày thực hiện</label>
            <SaoDatePicker value={debtActionForm.date} onChange={v => setDebtActionForm({ ...debtActionForm, date: v })} required />
          </div>
          <SaoButton variant="primary" type="submit">
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> Ghi nhận giao dịch
          </SaoButton>
        </form>
      );
    }

    if (modalType === 'debts') {
      return (
        <form onSubmit={handleSaveDebt}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Người vay / Chủ nợ</label>
            <SaoInput type="text" placeholder="Tên người đó..." value={debtForm.personName} onChange={e => setDebtForm({ ...debtForm, personName: e.target.value })} required />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Loại nợ</label>
              <SaoSelect
                initialValue={debtForm.type}
                options={[
                  { value: 'lent', label: 'Cho vay (Người ta nợ mình)' },
                  { value: 'borrowed', label: 'Đi vay (Mình nợ người ta)' }
                ]}
                onChange={v => setDebtForm({ ...debtForm, type: v })}
              />
            </div>
            {editingItem && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Trạng thái</label>
                <SaoSelect
                  initialValue={debtForm.status}
                  options={[
                    { value: 'unpaid', label: 'Chưa trả' },
                    { value: 'partial', label: 'Trả 1 phần' },
                    { value: 'paid', label: 'Đã thanh toán' }
                  ]}
                  onChange={v => setDebtForm({ ...debtForm, status: v })}
                />
              </div>
            )}
          </div>
          {!editingItem && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số tiền (VND)</label>
              <SaoInput type="number" placeholder="VD: 1000000" value={debtForm.amount} onChange={e => setDebtForm({ ...debtForm, amount: e.target.value })} required />
            </div>
          )}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ngày đến hạn (Tùy chọn)</label>
              <SaoDatePicker value={debtForm.dueDate} onChange={v => setDebtForm({ ...debtForm, dueDate: v })} />
            </div>
            {!editingItem && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nguồn tiền Trừ/Cộng</label>
                <SaoSelect
                  initialValue={debtForm.wallet_id}
                  placeholder="Chọn nguồn tiền"
                  options={wallets.map(w => ({ value: w.id, label: w.name }))}
                  onChange={v => setDebtForm({ ...debtForm, wallet_id: v })}
                />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <SaoButton variant="primary" type="submit">
              <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thêm sổ nợ'}
            </SaoButton>
            {editingItem && (
              <SaoButton variant="danger" type="button" onClick={() => handleDeleteDebt(editingItem.id)}>
                <Trash2 size={18} style={{ display: 'inline', marginRight: 8 }} /> Xóa
              </SaoButton>
            )}
          </div>
        </form>
      );
    }

    if (modalType === 'inventory') {
      return (
        <form onSubmit={handleSaveInventory}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tên món đồ / Gia vị</label>
            <SaoInput type="text" placeholder="VD: Gạo ST25, Mì tôm..." value={inventoryForm.name} onChange={e => setInventoryForm({ ...inventoryForm, name: e.target.value })} required />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ngày mua</label>
              <SaoDatePicker value={inventoryForm.purchaseDate} onChange={v => setInventoryForm({ ...inventoryForm, purchaseDate: v })} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Hạn sử dụng (Tùy chọn)</label>
              <SaoDatePicker value={inventoryForm.expiryDate} onChange={v => setInventoryForm({ ...inventoryForm, expiryDate: v })} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phân loại</label>
              <SaoSelect
                initialValue={inventoryForm.category}
                options={INVENTORY_CATEGORY_OPTIONS}
                onChange={v => setInventoryForm({ ...inventoryForm, category: v })}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số lượng</label>
              <SaoInput type="number" min="1" step="1" placeholder="VD: 5" value={inventoryForm.quantity} onChange={e => setInventoryForm({ ...inventoryForm, quantity: e.target.value })} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Đơn vị</label>
              <SaoSelect
                initialValue={inventoryForm.unit}
                placeholder="VD: kg, gói, chai..."
                allowCustom={true}
                options={INVENTORY_UNIT_OPTIONS}
                onChange={v => setInventoryForm({ ...inventoryForm, unit: v })}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: 10, marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#a0c4ff' }}>
              <input
                type="checkbox"
                checked={inventoryForm.isGift}
                onChange={e => {
                  setInventoryForm({ ...inventoryForm, isGift: e.target.checked, wallet_id: e.target.checked ? '' : inventoryForm.wallet_id });
                }}
                style={{ width: 18, height: 18 }}
              />
              Đây là đồ được cho/tặng (Không mất tiền ví)
            </label>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tổng tiền mua / Ước tính giá</label>
              <SaoInput type="number" placeholder="VD: 200000" value={inventoryForm.totalValue} onChange={e => setInventoryForm({ ...inventoryForm, totalValue: e.target.value })} />
              {inventoryForm.quantity && inventoryForm.totalValue && Number(inventoryForm.quantity) > 0 && (
                <small style={{ color: '#a0c4ff', marginTop: 6, display: 'block' }}>
                  Tỉ lệ: ≈ {formatMoney(Math.round(Number(inventoryForm.totalValue) / Number(inventoryForm.quantity)))} đ / {inventoryForm.unit || 'đơn vị'}
                </small>
              )}
            </div>
            {!inventoryForm.isGift && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nguồn chi tiền</label>
                <SaoSelect
                  initialValue={inventoryForm.wallet_id}
                  placeholder="Chọn nguồn tiền"
                  options={wallets.map(w => ({ value: w.id, label: w.name }))}
                  onChange={v => setInventoryForm({ ...inventoryForm, wallet_id: v })}
                />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <SaoButton variant="primary" type="submit">
              <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thêm vào kho'}
            </SaoButton>
            {editingItem && (
              <SaoButton variant="danger" type="button" onClick={() => handleDeleteInventory(editingItem.id)}>
                <Trash2 size={18} style={{ display: 'inline', marginRight: 8 }} /> Xóa
              </SaoButton>
            )}
          </div>
        </form>
      );
    }

    if (modalType === 'scan_bill_review') {
      const totalAmount = scannedBillItems.filter(i => i.keep && !i.isGift).reduce((sum, item) => sum + (item.price || 0), 0);

      return (
        <form onSubmit={handleSaveScannedBill}>
          <div className={styles.scannedItemsTable} style={{ overflowX: 'auto', paddingBottom: 10 }}>
            <div className={styles.tableHeader} style={{ minWidth: 600 }}>
              <div style={{ flex: 2, minWidth: 120 }}>Tên món đồ</div>
              <div style={{ flex: 1, minWidth: 100 }}>SL</div>
              <div style={{ flex: 1, minWidth: 90 }}>Giá tiền</div>
              <div style={{ flex: 1, minWidth: 120 }}>Loại</div>
              <div style={{ width: 60, minWidth: 60, textAlign: 'center' }}>Tùy chọn</div>
            </div>
            {scannedBillItems.map((item, index) => (
              <div key={item.id} className={`${styles.tableRow} ${!item.keep ? styles.deletedRow : ''}`} style={{ minWidth: 600 }}>
                <div style={{ flex: 2 }}>
                  <SaoInput type="text" value={item.name} onChange={e => {
                    const newItems = [...scannedBillItems];
                    newItems[index].name = e.target.value;
                    setScannedBillItems(newItems);
                  }} disabled={!item.keep} />
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 5 }}>
                  <SaoInput type="number" style={{ width: '60%' }} value={item.quantity} onChange={e => {
                    const newItems = [...scannedBillItems];
                    newItems[index].quantity = parseFloat(e.target.value) || 0;
                    setScannedBillItems(newItems);
                  }} disabled={!item.keep} />
                  <SaoInput type="text" style={{ width: '40%' }} value={item.unit} onChange={e => {
                    const newItems = [...scannedBillItems];
                    newItems[index].unit = e.target.value;
                    setScannedBillItems(newItems);
                  }} disabled={!item.keep} />
                </div>
                <div style={{ flex: 1 }}>
                  <SaoInput type="number" value={item.price} onChange={e => {
                    const newItems = [...scannedBillItems];
                    newItems[index].price = parseFloat(e.target.value) || 0;
                    setScannedBillItems(newItems);
                  }} disabled={!item.keep || item.isGift} />
                </div>
                <div style={{ flex: 1 }}>
                  <SaoSelect options={[...INVENTORY_CATEGORY_OPTIONS, ...FINANCE_CATEGORY_OPTIONS.filter(c => c.value !== 'food' && c.value !== 'other'), { value: 'other', label: 'Khác' }]} initialValue={item.category} onChange={v => {
                    const newItems = [...scannedBillItems];
                    newItems[index].category = v;
                    setScannedBillItems(newItems);
                  }} disabled={!item.keep} />
                </div>
                <div style={{ width: 60, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: item.isGift ? '#00ffaa' : '#a0c4ff' }}>
                    <input type="checkbox" checked={item.isGift} onChange={e => {
                      const newItems = [...scannedBillItems];
                      newItems[index].isGift = e.target.checked;
                      setScannedBillItems(newItems);
                    }} disabled={!item.keep} />
                    Free
                  </label>
                  <button type="button" onClick={() => {
                    const newItems = [...scannedBillItems];
                    newItems[index].keep = !newItems[index].keep;
                    setScannedBillItems(newItems);
                  }} style={{ background: 'transparent', border: 'none', color: item.keep ? '#ff4444' : '#00f0ff', cursor: 'pointer', padding: 5 }}>
                    {item.keep ? <Trash2 size={16} /> : <RotateCcw size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 15, background: 'rgba(0,0,0,0.3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>Tổng tiền: {formatMoney(totalAmount)} VND</div>
              <div style={{ fontSize: '0.9rem', color: '#a0c4ff' }}>Đánh dấu "Free" hoặc xóa sẽ không tính tiền.</div>
            </div>
            <div style={{ minWidth: 250 }}>
              <label className={styles.formLabel}>Nguồn tiền</label>
              <SaoSelect
                initialValue={billWalletId}
                placeholder="Chọn nguồn tiền..."
                options={wallets.map(w => ({ value: w.id, label: `${w.name} (${formatMoney(w.balance)})` }))}
                onChange={v => setBillWalletId(v)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: 20 }}>
            <SaoButton variant="primary" type="submit">
              <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> Nhập kho & Lưu chi tiêu
            </SaoButton>
          </div>
        </form>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className={styles.financeContainer}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <Wallet className={styles.titleIcon} size={28} />
            <h1 className={styles.title}>Finance Center</h1>
          </div>
        </div>
        <SaoLoading fullPage />
      </div>
    );
  }

  return (
    <div className={styles.financeContainer}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Wallet className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>Finance Center</h1>
        </div>
        <SaoButton
          variant="primary"
          onClick={() => setIsSmartModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)' }}
        >
          <Sparkles size={18} /> Ghi chép AI (Smart Command)
        </SaoButton>
      </div>

      <SaoTabs
        tabs={FINANCE_TABS.map(t => ({ id: t.id, label: t.label, icon: <t.icon size={18} /> }))}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as FinanceTabId)}
      />

      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <OverviewTab
            wallets={wallets}
            transactions={transactions}
            formatMoney={formatMoney}
            onAddTransaction={() => openModal('transaction')}
            onEditWallet={(w) => openModal('wallets', w)}
          />
        )}
        {activeTab === 'wallets' && (
          <WalletsTab
            wallets={wallets}
            formatMoney={formatMoney}
            onAdd={() => openModal('wallets')}
            onEdit={(w) => openModal('wallets', w)}
          />
        )}
        {activeTab === 'budgets' && (
          <BudgetsTab
            budgets={budgets}
            formatMoney={formatMoney}
            onAdd={() => openModal('budgets')}
            onEdit={(b) => openModal('budgets', b)}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            transactions={transactions}
            formatMoney={formatMoney}
            onAdd={() => openModal('transaction')}
            onEdit={(tx) => openModal('history', tx)}
            onDelete={handleDeleteTransaction}
          />
        )}
        {activeTab === 'debts' && (
          <DebtsTab
            debts={debts}
            formatMoney={formatMoney}
            onAdd={() => openModal('debts')}
            onEdit={(d) => openModal('debts', d)}
            onDebtAction={openDebtActionModal}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab
            inventory={inventory}
            formatMoney={formatMoney}
            isFabExpanded={isInventoryFabExpanded}
            onToggleFab={() => setIsInventoryFabExpanded(!isInventoryFabExpanded)}
            onManualAdd={() => openModal('inventory')}
            onEdit={(item) => openModal('inventory', item)}
            onUpdateQty={updateInventoryQty}
            onScanBill={handleScanBill}
          />
        )}
      </div>

      <SaoModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          modalType === 'scan_bill_review'
            ? 'Duyệt Hóa Đơn AI'
            : modalType === 'debt_action'
            ? 'Biến động Sổ Nợ'
            : editingItem
              ? `Chỉnh sửa ${modalType === 'transaction' || modalType === 'history' ? 'Giao dịch' : modalType === 'wallets' ? 'Nguồn tiền' : modalType === 'budgets' ? 'Hạn mức' : modalType === 'debts' ? 'Sổ nợ' : 'Kho dự trữ'}`
              : `Thêm ${modalType === 'transaction' ? 'Giao dịch' : modalType === 'wallets' ? 'Nguồn tiền' : modalType === 'budgets' ? 'Hạn mức' : modalType === 'debts' ? 'Sổ nợ' : 'Kho dự trữ'}`
        }
      >
        {renderModalContent()}
      </SaoModal>

      <SmartExpenseModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        onSuccess={() => fetchData(true)}
        formatMoney={formatMoney}
      />
    </div>
  );
}
