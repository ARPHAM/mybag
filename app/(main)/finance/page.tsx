"use client";

import { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Activity, CreditCard, Clock, Users, Package, ArrowRightLeft, Building2, Smartphone, Banknote, Coffee, Home as HomeIcon, ShoppingBag, Gamepad2, Car, AlertTriangle, ArrowDown, ArrowUp, CalendarDays, User, Calendar, CheckCircle2, Minus, ShieldAlert, Wheat, Edit3, Save, ChevronDown, ChevronRight, Trash2, Camera, RotateCcw } from 'lucide-react';
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

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTabId>('overview');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [debtFilter, setDebtFilter] = useState<'all' | 'lent' | 'borrowed'>('all');

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

  const closeModal = () => setIsModalOpen(false);
  const { showAlert, showConfirm } = useSaoAlert();

  useEffect(() => {
    fetchData();
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
          walletName: t.walletName
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
      fetchData(true); // Rollback on error
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
             alert(data.error || 'Lỗi quét hóa đơn');
          }
        } catch (err) {
           console.error(err);
           alert('Lỗi gọi API AI');
        } finally {
           setIsScanningBill(false);
           e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert('Lỗi đọc file hóa đơn');
      setIsScanningBill(false);
      e.target.value = '';
    }
  };

  const handleSaveScannedBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToSave = scannedBillItems.filter(i => i.keep);
    
    const needsWallet = itemsToSave.some(i => !i.isGift && (i.price > 0));
    if (needsWallet && !billWalletId) {
      alert('Vui lòng chọn nguồn tiền thanh toán cho hóa đơn này.');
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
      alert('Có lỗi xảy ra khi lưu một số mặt hàng.');
    }
  };

  const openModal = (type: 'wallets' | 'transaction' | 'budgets' | 'debts' | 'debt_action' | 'inventory' | 'history' | 'scan_bill_review', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'wallets') {
      setWalletForm(item ? { name: item.name, type: item.type, color: item.color, balance: item.balance.toString() } : { name: '', type: 'bank', color: '#00f0ff', balance: '' });
    }
    if (type === 'transaction') {
      setTxForm(item ? {
        type: item.type, amount: item.amount.toString(), wallet_id: '', to_wallet_id: '', date: item.date, description: item.description, category: item.category || 'food'
      } : {
        type: 'expense', amount: '', wallet_id: '', to_wallet_id: '', date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], description: '', category: 'food'
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

  // Tính toán Overview từ dữ liệu thật
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const currentMonth = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
  const monthlyIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);

  const formatMoney = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const renderOverview = () => (
    <div className={styles.overviewGrid}>
      <div className={styles.totalBalanceCard}>
        <div className={styles.balanceLabel}>
          <Wallet size={20} /> Tổng Tài Sản
        </div>
        <div className={styles.balanceAmount}>
          {formatMoney(totalBalance)} <span className={styles.currency}>VND</span>
        </div>
      </div>

      <div className={`${styles.summaryCard} ${styles.income}`}>
        <div className={styles.summaryHeader}>
          <ArrowUpRight size={18} color="#00ffaa" /> Tổng Thu (Tháng này)
        </div>
        <div className={`${styles.summaryAmount} ${styles.income}`}>
          +{formatMoney(monthlyIncome)} <span style={{ fontSize: '1rem', color: '#a0c4ff', fontWeight: 'normal' }}>VND</span>
        </div>
      </div>

      <div className={`${styles.summaryCard} ${styles.expense}`}>
        <div className={styles.summaryHeader}>
          <ArrowDownRight size={18} color="#ff4444" /> Tổng Chi (Tháng này)
        </div>
        <div className={`${styles.summaryAmount} ${styles.expense}`}>
          -{formatMoney(monthlyExpense)} <span style={{ fontSize: '1rem', color: '#a0c4ff', fontWeight: 'normal' }}>VND</span>
        </div>
      </div>

      {/* Nút to bự góc dưới */}
      <SaoButton variant="primary" style={{ borderRadius: "50%", width: 50, height: 50, position: "absolute", bottom: 30, right: 30, zIndex: 100, boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)" }} title="Ghi chép giao dịch">
        <Plus size={32} />
      </SaoButton>
    </div>
  );

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Building2 size={24} />;
      case 'ewallet': return <Smartphone size={24} />;
      case 'cash': return <Banknote size={24} />;
      default: return <Wallet size={24} />;
    }
  };

  const renderWallets = () => (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className={styles.walletsGrid}>
        {wallets.map(wallet => (
          <div key={wallet.id} className={styles.walletCard} style={{ '--wallet-color': wallet.color } as React.CSSProperties}>
            <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openModal('wallets', wallet); }}>
              <Edit3 size={16} />
            </SaoButton>
            <div className={styles.walletTop}>
              <div className={styles.walletName}>
                {getWalletIcon(wallet.type)}
                {wallet.name}
              </div>
              <div className={styles.walletType}>{wallet.type}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.9rem', color: '#a0c4ff', textTransform: 'uppercase' }}>Số dư khả dụng</div>
              <div className={styles.walletBalance}>
                {formatMoney(wallet.balance)} <span className={styles.walletCurrency}>VND</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nút to bự góc dưới - Dùng chung cho mọi tab để thống nhất UX */}
      <SaoButton variant="primary" style={{ borderRadius: "50%", width: 50, height: 50, position: "absolute", bottom: 30, right: 30, zIndex: 100, boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)" }} title="Thêm nguồn tiền mới" onClick={() => openModal('wallets')}>
        <Plus size={32} />
      </SaoButton>
    </div>
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return <Coffee size={18} color="#00ffaa" />;
      case 'housing': return <HomeIcon size={18} color="#00ffaa" />;
      case 'shopping': return <ShoppingBag size={18} color="#00ffaa" />;
      case 'entertainment': return <Gamepad2 size={18} color="#00ffaa" />;
      case 'transport': return <Car size={18} color="#00ffaa" />;
      default: return <CreditCard size={18} color="#00ffaa" />;
    }
  };

  const renderBudgets = () => (
    <div style={{ animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <div className={styles.budgetsGrid}>
        {budgets.map(pocket => {
          const percent = Math.min((pocket.spent / pocket.limit) * 100, 100);
          const isOver = pocket.spent > pocket.limit;

          let hpClass = styles.hpSafe;
          if (percent >= 100) hpClass = styles.hpDanger;
          else if (percent >= 80) hpClass = styles.hpWarning;

          return (
            <div key={pocket.id} className={styles.budgetCard}>
              <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openModal('budgets', pocket); }}>
                <Edit3 size={16} />
              </SaoButton>
              <div className={styles.budgetHeader}>
                <div className={styles.budgetName}>
                  {getCategoryIcon(pocket.category)}
                  {pocket.name}
                </div>
                <div className={styles.budgetAmounts}>
                  <span>{formatMoney(pocket.spent)}</span> / {formatMoney(pocket.limit)} <small>VND</small>
                </div>
              </div>

              <div className={styles.hpBarContainer}>
                <div
                  className={`${styles.hpBarFill} ${hpClass}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {isOver && (
                <div className={styles.overBudgetText}>
                  <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  Đã vượt hạn mức {formatMoney(pocket.spent - pocket.limit)} VND!
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SaoButton variant="primary" style={{ borderRadius: "50%", width: 50, height: 50, position: "absolute", bottom: 30, right: 30, zIndex: 100, boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)" }} title="Thiết lập hạn mức mới" onClick={() => openModal('budgets')}>
        <Plus size={32} />
      </SaoButton>
    </div>
  );

  const renderHistory = () => {
    const filteredTx = transactions.filter(tx => historyFilter === 'all' || tx.type === historyFilter);

    // Group by date (simplified for MVP)
    const grouped = filteredTx.reduce((acc, tx) => {
      if (!acc[tx.date]) acc[tx.date] = [];
      acc[tx.date].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);

    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div className={styles.historyFilterBar}>
          <SaoButton
            className={`${styles.filterBtn} ${historyFilter === 'all' ? styles.active : ''}`}
            onClick={() => setHistoryFilter('all')}
          >Tất cả</SaoButton>
          <SaoButton
            className={`${styles.filterBtn} ${historyFilter === 'income' ? styles.active : ''}`}
            onClick={() => setHistoryFilter('income')}
          >Thu nhập</SaoButton>
          <SaoButton
            className={`${styles.filterBtn} ${historyFilter === 'expense' ? styles.active : ''}`}
            onClick={() => setHistoryFilter('expense')}
          >Chi tiêu</SaoButton>
          <SaoButton
            className={`${styles.filterBtn} ${historyFilter === 'transfer' ? styles.active : ''}`}
            onClick={() => setHistoryFilter('transfer')}
          >Chuyển khoản</SaoButton>
        </div>

        <div className={styles.historyList}>
          {Object.keys(grouped).map(date => (
            <div key={date}>
              <div className={styles.historyDateGroup}>
                <CalendarDays size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                Ngày {date}
              </div>

              <div className={styles.historyList}>
                {grouped[date].map(tx => (
                  <div key={tx.id} className={styles.historyItem}>
                    <div className={styles.historyItemLeft}>
                      <div className={`${styles.historyIcon} ${styles[tx.type]}`}>
                        {tx.type === 'income' && <ArrowDown size={20} />}
                        {tx.type === 'expense' && <ArrowUp size={20} />}
                        {tx.type === 'transfer' && <ArrowRightLeft size={20} />}
                      </div>
                      <div className={styles.historyDetails}>
                        <div className={styles.historyTitle}>
                          {tx.description}
                          <SaoButton variant="ghost" style={{ marginLeft: 8, padding: 4 }} onClick={() => openModal('history', tx)}>
                            <Edit3 size={14} />
                          </SaoButton>
                          <SaoButton variant="ghost" ghostType="danger" style={{ marginLeft: 8, padding: 4 }} onClick={() => handleDeleteTransaction(tx.id)}>
                            <Trash2 size={14} />
                          </SaoButton>
                        </div>
                        <div className={styles.historyMeta}>
                          <span><Wallet size={12} /> {tx.walletName}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`${styles.historyAmount} ${styles[tx.type]}`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatMoney(tx.amount)} <small>VND</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredTx.length === 0 && (
            <div className={styles.emptyState} style={{ marginTop: 20 }}>
              Không có giao dịch nào phù hợp.
            </div>
          )}
        </div>

        <SaoButton variant="primary" style={{ borderRadius: "50%", width: 50, height: 50, position: "absolute", bottom: 30, right: 30, zIndex: 100, boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)" }} title="Ghi chép giao dịch" onClick={() => openModal('transaction')}>
          <Plus size={32} />
        </SaoButton>
      </div>
    );
  };

  const renderDebts = () => {
    // Sort logic: Move paid debts to the bottom
    const sortedDebts = [...debts].sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      return 0;
    });
    const filteredDebts = sortedDebts.filter(d => debtFilter === 'all' || d.type === debtFilter);

    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div className={styles.historyFilterBar}>
          <SaoButton
            className={`${styles.filterBtn} ${debtFilter === 'all' ? styles.active : ''}`}
            onClick={() => setDebtFilter('all')}
          >Tất cả</SaoButton>
          <SaoButton
            className={`${styles.filterBtn} ${debtFilter === 'lent' ? styles.active : ''}`}
            onClick={() => setDebtFilter('lent')}
          >Cho vay</SaoButton>
          <SaoButton
            className={`${styles.filterBtn} ${debtFilter === 'borrowed' ? styles.active : ''}`}
            onClick={() => setDebtFilter('borrowed')}
          >Đi vay</SaoButton>
        </div>

        <div className={styles.debtsGrid}>
          {filteredDebts.map(debt => {
            const percentPaid = Math.min(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100, 100);

            return (
              <div key={debt.id} className={`${styles.debtCard} ${styles[debt.type]} ${debt.status === 'paid' ? styles.paid : ''}`}>
                {debt.status === 'paid' && <div className={styles.debtCleared}>CLEARED</div>}

                <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openModal('debts', debt); }}>
                  <Edit3 size={16} />
                </SaoButton>
                <div className={styles.debtTop}>
                  <div className={styles.debtPerson}>
                    <div className={styles.debtAvatar}>
                      <User size={20} color={debt.type === 'lent' ? '#00ffaa' : '#ffaa00'} />
                    </div>
                    <div>
                      <div className={styles.debtName}>{debt.personName}</div>
                      <div className={styles.debtTypeLabel}>
                        {debt.type === 'lent' ? 'Cho vay' : 'Đi vay'}
                      </div>
                    </div>
                  </div>
                  <div className={`${styles.debtBadge} ${styles[debt.status]}`}>
                    {debt.status === 'unpaid' ? 'Chưa trả' : debt.status === 'partial' ? 'Đã trả 1 phần' : 'Đã thanh toán'}
                  </div>
                </div>

                <div className={styles.debtAmountSection} style={{ paddingBottom: '10px', borderBottom: debt.history && debt.history.length > 0 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#a0c4ff', marginBottom: '8px' }}>
                    <span>Đã trả: {formatMoney(debt.totalAmount - debt.remainingAmount)}</span>
                    <span>Tổng: {formatMoney(debt.totalAmount)}</span>
                  </div>
                  <div className={styles.debtProgressBg}>
                    <div className={styles.debtProgressFill} style={{ width: `${percentPaid}%` }} />
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', textAlign: 'right', marginTop: '8px' }}>
                    Còn lại: <span style={{ color: debt.type === 'lent' ? '#00ffaa' : '#ffaa00' }}>{formatMoney(debt.remainingAmount)}</span> <small style={{ fontWeight: 'normal', fontSize: '1rem' }}>VND</small>
                  </div>

                  {debt.status !== 'paid' ? (
                    <div className={styles.debtDueDate} style={{ marginTop: '10px' }}>
                      <Calendar size={14} /> Hạn chót: {debt.dueDate}
                    </div>
                  ) : (
                    <div className={styles.debtDueDate} style={{ color: '#00ffaa', marginTop: '10px' }}>
                      <CheckCircle2 size={14} /> Hoàn tất: {debt.completedDate}
                    </div>
                  )}
                </div>

                {debt.history && debt.history.length > 0 && (
                  <details className={styles.debtHistoryDetails}>
                    <summary><Clock size={14} /> Lịch sử giao dịch</summary>
                    <div className={styles.debtHistoryList}>
                      {debt.history.map(h => (
                        <div key={h.id} className={styles.debtHistoryRecord}>
                          <span>{h.date} - <Wallet size={10} style={{ display: 'inline', marginRight: 4 }} /> {h.walletName}</span>
                          <span style={{ color: h.type === 'pay_back' ? '#00ffaa' : '#ffaa00' }}>
                            {h.type === 'pay_back' ? 'Trả vào' : 'Vay thêm'}: {formatMoney(h.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {debt.status !== 'paid' && (
                  <div className={styles.debtActionBtns}>
                    <SaoButton variant="primary" onClick={() => openDebtActionModal(debt, 'pay_back')}>
                      <CheckCircle2 size={16} /> {debt.type === 'lent' ? 'Thu Nợ' : 'Trả Nợ'}
                    </SaoButton>
                    <SaoButton variant="primary" onClick={() => openDebtActionModal(debt, 'borrow_more')}>
                      <Plus size={16} /> {debt.type === 'lent' ? 'Cho Vay Thêm' : 'Vay Thêm'}
                    </SaoButton>
                  </div>
                )}
              </div>
            );
          })}
          {filteredDebts.length === 0 && (
            <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
              Không có khoản nợ nào.
            </div>
          )}
        </div>

        <SaoButton variant="primary" style={{ borderRadius: "50%", width: 50, height: 50, position: "absolute", bottom: 30, right: 30, zIndex: 100, boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)" }} title="Thêm khoản nợ mới" onClick={() => openModal('debts')}>
          <Plus size={32} />
        </SaoButton>
      </div>
    );
  };

  const renderInventory = () => {
    // Sort logic: Move items with quantity 0 to the bottom
    const sortedInventory = [...inventory].sort((a, b) => {
      if (a.quantity === 0 && b.quantity > 0) return 1;
      if (a.quantity > 0 && b.quantity === 0) return -1;
      return 0;
    });

    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div className={styles.inventoryGrid}>
          {sortedInventory.map(item => {
            let stockClass = styles.stockHigh;
            if (item.quantity === 0) stockClass = styles.stockEmpty;
            else if (item.quantity <= 2) stockClass = styles.stockLow;

            return (
              <div key={item.id} className={`${styles.inventoryCard} ${stockClass}`}>
                <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openModal('inventory', item); }}>
                  <Edit3 size={16} />
                </SaoButton>
                <div className={styles.inventoryContent}>
                  <div className={styles.inventoryName}>
                    {item.category === 'food' ? <Wheat size={18} color="#00ffaa" /> : <Package size={18} color="#a0c4ff" />}
                    {item.name}
                  </div>
                  <div className={styles.inventoryMeta}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Phân loại: {item.category === 'food' ? 'Thực phẩm' : item.category === 'spices' ? 'Gia vị' : 'Đồ dùng'}</span>
                      <span style={{ color: '#00f0ff' }}>
                        {item.isGift ? '🎁 Được tặng' : (
                          <>
                            <Wallet size={10} style={{ display: 'inline', marginRight: 4 }} />
                            {item.walletName}
                          </>
                        )}
                      </span>
                    </div>
                    {(item.totalValue !== undefined && item.totalValue > 0) && (
                      <div style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '4px' }}>
                        {item.isGift ? 'Ước tính giá:' : 'Tổng giá trị:'} {formatMoney(item.totalValue)}
                        {item.quantity > 0 && (
                          <span style={{ color: '#a0c4ff' }}> (≈ {formatMoney(Math.round(item.totalValue / item.quantity))} đ/{item.unit})</span>
                        )}
                      </div>
                    )}
                    {item.expiryDate && (
                      <span className={styles.inventoryWarning}>
                        <ShieldAlert size={12} /> {item.expiryDate}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.inventoryActions}>
                  <SaoButton
                    variant="ghost"
                    className={styles.qtyBtn}
                    onClick={() => updateInventoryQty(item.id, -1)}
                    disabled={item.quantity <= 1}
                    style={{ opacity: item.quantity <= 1 ? 0.5 : 1, cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', padding: 0 }}
                  >
                    <Minus size={16} />
                  </SaoButton>
                  <div className={styles.qtyValue}>
                    {item.quantity}
                    <span className={styles.qtyUnit}>{item.unit}</span>
                  </div>
                  <SaoButton
                    variant="ghost"
                    className={styles.qtyBtn}
                    onClick={() => updateInventoryQty(item.id, 1)}
                    style={{ padding: 0 }}
                  >
                    <Plus size={16} />
                  </SaoButton>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ position: "absolute", bottom: 30, right: 30, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className={styles.scanFabLabel} title="Quét hóa đơn bằng AI">
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanBill} />
            <div className={styles.scanFab}>
              <Camera size={24} />
            </div>
          </label>
          <SaoButton variant="primary" style={{ borderRadius: "50%", width: 50, height: 50, boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)" }} title="Thêm đồ dự trữ mới" onClick={() => openModal('inventory')}>
            <Plus size={32} />
          </SaoButton>
        </div>
      </div>
    );
  };

  const renderPlaceholder = (title: string) => (
    <div className={styles.emptyState}>
      <Activity size={48} opacity={0.5} />
      <h2>{title}</h2>
      <p>Hệ thống đang được xây dựng. Vui lòng quay lại sau!</p>
    </div>
  );

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
          wallet_id: debtActionForm.wallet_id
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
            <SaoButton variant="primary" type="submit" >
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
          <SaoButton variant="primary" type="submit" >
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
            <SaoButton variant="primary" type="submit" >
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
          <SaoButton variant="primary" type="submit" >
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
            <SaoButton variant="primary" type="submit" >
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
            <SaoButton variant="primary" type="submit" >
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
          <div className={styles.scannedItemsTable}>
            <div className={styles.tableHeader}>
              <div style={{ flex: 2 }}>Tên món đồ</div>
              <div style={{ flex: 1 }}>SL</div>
              <div style={{ flex: 1 }}>Giá tiền</div>
              <div style={{ flex: 1 }}>Loại</div>
              <div style={{ width: 60, textAlign: 'center' }}>Tùy chọn</div>
            </div>
            {scannedBillItems.map((item, index) => (
              <div key={item.id} className={`${styles.tableRow} ${!item.keep ? styles.deletedRow : ''}`}>
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
                   <SaoSelect options={[...INVENTORY_CATEGORY_OPTIONS, ...FINANCE_CATEGORY_OPTIONS.filter(c => c.value !== 'food' && c.value !== 'other'), {value: 'other', label: 'Khác'}]} initialValue={item.category} onChange={v => {
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
            <SaoButton variant="primary" type="submit" >
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
      </div>

      <SaoTabs
        tabs={FINANCE_TABS.map(t => ({ id: t.id, label: t.label, icon: <t.icon size={18} /> }))}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as FinanceTabId)}
      />

      <div className={styles.tabContent}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'wallets' && renderWallets()}
        {activeTab === 'budgets' && renderBudgets()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'debts' && renderDebts()}
        {activeTab === 'inventory' && renderInventory()}
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
    </div>
  );
}
