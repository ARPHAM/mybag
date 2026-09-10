"use client";

import { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Activity, CreditCard, Clock, Users, Package, ArrowRightLeft, Building2, Smartphone, Banknote, Coffee, Home as HomeIcon, ShoppingBag, Gamepad2, Car, AlertTriangle, ArrowDown, ArrowUp, CalendarDays, User, Calendar, CheckCircle2, Minus, ShieldAlert, Wheat, Edit3, Save, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import SaoModal from '../../components/SaoModal/SaoModal';
import SaoSelect from '../../components/SaoSelect/SaoSelect';
import SaoTabs from '../../components/SaoTabs/SaoTabs';
import SaoDatePicker from '../../components/SaoDatePicker/SaoDatePicker';
import { useSaoAlert } from '../../contexts/AlertContext';
import styles from './finance.module.css';

type TabId = 'overview' | 'wallets' | 'budgets' | 'history' | 'debts' | 'inventory';

interface WalletSource {
  id: string;
  name: string;
  balance: number;
  type: 'bank' | 'ewallet' | 'cash';
  color: string;
}

interface BudgetPocket {
  id: string;
  name: string;
  spent: number;
  limit: number;
  category: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  description: string;
  walletName: string;
}

interface DebtRecord {
  id: string;
  date: string;
  amount: number;
  type: 'borrow_more' | 'pay_back';
  walletName: string;
}

interface DebtItem {
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

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  originalQuantity: number;
  unit: string;
  expiryDate?: string;
  category: 'food' | 'spices' | 'utilities';
  totalValue: number;
  walletName: string;
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [debtFilter, setDebtFilter] = useState<'all' | 'lent' | 'borrowed'>('all');

  const [wallets, setWallets] = useState<WalletSource[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [walletForm, setWalletForm] = useState({ name: '', type: 'bank', color: '#00f0ff', balance: '' });
  const [txForm, setTxForm] = useState({ type: 'expense', amount: '', date: new Date().toISOString().split('T')[0], description: '', wallet_id: '', to_wallet_id: '' });

  const { showAlert, showConfirm } = useSaoAlert();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [wRes, tRes] = await Promise.all([
        fetch('/api/finance/wallets'),
        fetch('/api/finance/transactions')
      ]);
      const wData = await wRes.json();
      const tData = await tRes.json();
      
      if (wRes.ok) {
        setWallets(wData.map((w: any) => ({
          id: w._id,
          name: w.name,
          balance: w.balance,
          type: w.type,
          color: w.color
        })));
      }
      if (tRes.ok) {
        setTransactions(tData.map((t: any) => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          date: t.date.split('T')[0],
          description: t.description,
          walletName: t.walletName
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
        const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
          if (isModalOpen) setIsModalOpen(false);
        } else {
          const err = await res.json();
          showAlert(err.error || 'Lỗi khi xóa giao dịch');
        }
      } catch (err) {
        console.error(err);
        showAlert('Lỗi hệ thống');
      }
    });
  };

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Tổng quan', icon: Activity },
    { id: 'wallets', label: 'Nguồn tiền', icon: Wallet },
    { id: 'budgets', label: 'Hạn mức', icon: CreditCard },
    { id: 'history', label: 'Lịch sử', icon: Clock },
    { id: 'debts', label: 'Sổ nợ', icon: Users },
    { id: 'inventory', label: 'Dự trữ', icon: Package },
  ];

  const [budgets, setBudgets] = useState<BudgetPocket[]>([
    { id: 'food', name: 'Ăn uống', spent: 3500000, limit: 5000000, category: 'food' },
    { id: 'rent', name: 'Tiền nhà & Điện nước', spent: 4000000, limit: 4000000, category: 'housing' },
    { id: 'shopping', name: 'Mua sắm', spent: 1800000, limit: 2000000, category: 'shopping' },
    { id: 'entertainment', name: 'Giải trí', spent: 1200000, limit: 1000000, category: 'entertainment' },
    { id: 'transport', name: 'Đi lại', spent: 250000, limit: 500000, category: 'transport' },
  ]);
  const [debts, setDebts] = useState<DebtItem[]>([
    { 
      id: 'd1', personName: 'Nguyễn Văn A', type: 'lent', status: 'unpaid', dueDate: '2023-11-05',
      totalAmount: 500000, remainingAmount: 500000, history: []
    },
    { 
      id: 'd2', personName: 'Trần Thị B', type: 'borrowed', status: 'partial', dueDate: '2023-10-30',
      totalAmount: 2000000, remainingAmount: 1500000, history: [
        { id: 'h1', date: '2023-10-25', amount: 500000, type: 'pay_back', walletName: 'MB Bank' }
      ]
    },
    { 
      id: 'd3', personName: 'Lê C', type: 'lent', status: 'paid', dueDate: '2023-10-20',
      totalAmount: 150000, remainingAmount: 0, completedDate: '2023-10-22', history: [
        { id: 'h2', date: '2023-10-22', amount: 150000, type: 'pay_back', walletName: 'Momo' }
      ]
    },
  ]);

  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: 'i1', name: 'Gạo ST25', quantity: 5, originalQuantity: 10, unit: 'kg', category: 'food', totalValue: 350000, walletName: 'MB Bank' },
    { id: 'i2', name: 'Mì tôm Hảo Hảo', quantity: 2, originalQuantity: 3, unit: 'gói', category: 'food', expiryDate: 'Sắp hết hạn (Còn 5 ngày)', totalValue: 10000, walletName: 'Tiền mặt' },
    { id: 'i5', name: 'Hành ngò (Mua lẻ)', quantity: 1, originalQuantity: 1, unit: 'phần', category: 'spices', totalValue: 5000, walletName: 'Tiền mặt' },
    { id: 'i4', name: 'Nước rửa bát', quantity: 1, originalQuantity: 1, unit: 'chai', category: 'utilities', totalValue: 25000, walletName: 'MB Bank' },
    { id: 'i3', name: 'Dầu ăn Tường An', quantity: 0, originalQuantity: 1, unit: 'chai', category: 'spices', totalValue: 55000, walletName: 'Momo' },
  ]);

  const updateInventoryQty = (id: string, delta: number) => {
    setInventory(inventory.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TabId | 'transaction' | 'debt_action'>('transaction');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [debtActionType, setDebtActionType] = useState<'borrow_more' | 'pay_back' | null>(null);

  const openModal = (type: TabId | 'transaction', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'wallets') {
      setWalletForm(item ? { name: item.name, type: item.type, color: item.color, balance: item.balance.toString() } : { name: '', type: 'bank', color: '#00f0ff', balance: '' });
    }
    if (type === 'transaction') {
      setTxForm(item ? { 
        type: item.type, amount: item.amount.toString(), wallet_id: '', to_wallet_id: '', date: item.date, description: item.description 
      } : { 
        type: 'expense', amount: '', wallet_id: '', to_wallet_id: '', date: new Date().toISOString().split('T')[0], description: '' 
      });
    }
    setIsModalOpen(true);
  };

  const openDebtActionModal = (debt: DebtItem, action: 'borrow_more' | 'pay_back') => {
    setModalType('debt_action');
    setEditingItem(debt);
    setDebtActionType(action);
    setIsModalOpen(true);
  };

  // Tính toán Overview từ dữ liệu thật
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
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
      <button className={styles.floatingActionBtn} title="Ghi chép giao dịch">
        <Plus size={32} />
      </button>
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
            <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openModal('wallets', wallet); }}>
              <Edit3 size={16} />
            </button>
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
      <button className={styles.floatingActionBtn} title="Thêm nguồn tiền mới" onClick={() => openModal('wallets')}>
        <Plus size={32} />
      </button>
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
              <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openModal('budgets', pocket); }}>
                <Edit3 size={16} />
              </button>
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

      <button className={styles.floatingActionBtn} title="Thiết lập hạn mức mới" onClick={() => openModal('budgets')}>
        <Plus size={32} />
      </button>
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
          <button
            className={`${styles.filterBtn} ${historyFilter === 'all' ? styles.active : ''}`}
            onClick={() => setHistoryFilter('all')}
          >Tất cả</button>
          <button
            className={`${styles.filterBtn} ${historyFilter === 'income' ? styles.active : ''}`}
            onClick={() => setHistoryFilter('income')}
          >Thu nhập</button>
          <button
            className={`${styles.filterBtn} ${historyFilter === 'expense' ? styles.active : ''}`}
            onClick={() => setHistoryFilter('expense')}
          >Chi tiêu</button>
          <button
            className={`${styles.filterBtn} ${historyFilter === 'transfer' ? styles.active : ''}`}
            onClick={() => setHistoryFilter('transfer')}
          >Chuyển khoản</button>
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
                          <button style={{ background: 'none', border: 'none', color: 'rgba(0, 240, 255, 0.5)', cursor: 'pointer', marginLeft: 8 }} onClick={() => openModal('history', tx)}>
                            <Edit3 size={12} />
                          </button>
                          <button style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', marginLeft: 8, opacity: 0.7 }} onClick={() => handleDeleteTransaction(tx.id)}>
                            <Trash2 size={12} />
                          </button>
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

        <button className={styles.floatingActionBtn} title="Ghi chép giao dịch" onClick={() => openModal('transaction')}>
          <Plus size={32} />
        </button>
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
          <button
            className={`${styles.filterBtn} ${debtFilter === 'all' ? styles.active : ''}`}
            onClick={() => setDebtFilter('all')}
          >Tất cả</button>
          <button
            className={`${styles.filterBtn} ${debtFilter === 'lent' ? styles.active : ''}`}
            onClick={() => setDebtFilter('lent')}
          >Cho vay</button>
          <button
            className={`${styles.filterBtn} ${debtFilter === 'borrowed' ? styles.active : ''}`}
            onClick={() => setDebtFilter('borrowed')}
          >Đi vay</button>
        </div>

        <div className={styles.debtsGrid}>
          {filteredDebts.map(debt => {
            const percentPaid = Math.min(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100, 100);
            
            return (
              <div key={debt.id} className={`${styles.debtCard} ${styles[debt.type]} ${debt.status === 'paid' ? styles.paid : ''}`}>
                {debt.status === 'paid' && <div className={styles.debtCleared}>CLEARED</div>}
                
                <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openModal('debts', debt); }}>
                  <Edit3 size={16} />
                </button>
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
                    <button className={styles.btnPay} onClick={() => openDebtActionModal(debt, 'pay_back')}>
                      <CheckCircle2 size={16} /> {debt.type === 'lent' ? 'Thu Nợ' : 'Trả Nợ'}
                    </button>
                    <button className={styles.btnBorrow} onClick={() => openDebtActionModal(debt, 'borrow_more')}>
                      <Plus size={16} /> {debt.type === 'lent' ? 'Cho Vay Thêm' : 'Vay Thêm'}
                    </button>
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

        <button className={styles.floatingActionBtn} title="Thêm khoản nợ mới" onClick={() => openModal('debts')}>
          <Plus size={32} />
        </button>
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
                <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openModal('inventory', item); }}>
                  <Edit3 size={16} />
                </button>
                <div className={styles.inventoryContent}>
                  <div className={styles.inventoryName}>
                    {item.category === 'food' ? <Wheat size={18} color="#00ffaa" /> : <Package size={18} color="#a0c4ff" />}
                    {item.name}
                  </div>
                  <div className={styles.inventoryMeta}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Phân loại: {item.category === 'food' ? 'Thực phẩm' : item.category === 'spices' ? 'Gia vị' : 'Đồ dùng'}</span>
                      <span style={{ color: '#00f0ff' }}>
                        <Wallet size={10} style={{ display: 'inline', marginRight: 4 }} />
                        {item.walletName}
                      </span>
                    </div>
                    <div style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '4px' }}>
                      Tổng mua: {formatMoney(item.totalValue)}
                      <span style={{ color: '#a0c4ff' }}> (≈ {formatMoney(Math.round(item.totalValue / item.originalQuantity))} đ/{item.unit})</span>
                    </div>
                    {item.expiryDate && (
                      <span className={styles.inventoryWarning}>
                        <ShieldAlert size={12} /> {item.expiryDate}
                      </span>
                    )}
                  </div>
                </div>

              <div className={styles.inventoryActions}>
                <button
                  className={styles.qtyBtn}
                  onClick={() => updateInventoryQty(item.id, -1)}
                  disabled={item.quantity === 0}
                  style={{ opacity: item.quantity === 0 ? 0.5 : 1, cursor: item.quantity === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <Minus size={16} />
                </button>
                <div className={styles.qtyValue}>
                  {item.quantity}
                  <span className={styles.qtyUnit}>{item.unit}</span>
                </div>
                <button
                  className={styles.qtyBtn}
                  onClick={() => updateInventoryQty(item.id, 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button className={styles.floatingActionBtn} title="Thêm đồ dự trữ mới" onClick={() => openModal('inventory')}>
        <Plus size={32} />
      </button>
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
    // Dummy handler for UI parts not yet integrated with real APIs
    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      setIsModalOpen(false);
    };

    const handleSaveWallet = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/finance/wallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: walletForm.name, 
            type: walletForm.type, 
            color: walletForm.color, 
            balance: parseFloat(walletForm.balance) || 0 
          })
        });
        if (res.ok) {
          fetchData();
          setIsModalOpen(false);
        } else {
          const err = await res.json();
          showAlert(err.error);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const handleSaveTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/finance/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: txForm.type, 
            amount: parseFloat(txForm.amount) || 0, 
            date: txForm.date, 
            description: txForm.description,
            wallet_id: txForm.wallet_id,
            to_wallet_id: txForm.to_wallet_id
          })
        });
        if (res.ok) {
          fetchData();
          setIsModalOpen(false);
        } else {
          const err = await res.json();
          showAlert(err.error);
        }
      } catch (err) {
        console.error(err);
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
                  <input type="radio" name="type" checked={txForm.type === 'expense'} onChange={() => setTxForm({...txForm, type: 'expense'})} /> Chi tiêu
                </label>
                <label className={styles.formRadioLabel}>
                  <input type="radio" name="type" checked={txForm.type === 'income'} onChange={() => setTxForm({...txForm, type: 'income'})} /> Thu nhập
                </label>
                <label className={styles.formRadioLabel}>
                  <input type="radio" name="type" checked={txForm.type === 'transfer'} onChange={() => setTxForm({...txForm, type: 'transfer'})} /> Chuyển khoản
                </label>
              </div>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Số tiền (VND)</label>
            <input type="number" className={styles.formInput} placeholder="Nhập số tiền..." value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} required />
          </div>
          
          {txForm.type === 'transfer' ? (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Từ nguồn tiền (Trừ)</label>
                <SaoSelect
                  initialValue={txForm.wallet_id}
                  placeholder="Chọn nguồn tiền gửi"
                  options={wallets.map(w => ({ value: w.id, label: `${w.name} (${formatMoney(w.balance)})` }))}
                  onChange={v => setTxForm({...txForm, wallet_id: v})}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Đến nguồn tiền (Cộng)</label>
                <SaoSelect
                  initialValue={txForm.to_wallet_id}
                  placeholder="Chọn nguồn tiền nhận"
                  options={wallets.map(w => ({ value: w.id, label: w.name }))}
                  onChange={v => setTxForm({...txForm, to_wallet_id: v})}
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
                onChange={v => setTxForm({...txForm, wallet_id: v})}
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ngày giao dịch</label>
            <SaoDatePicker value={txForm.date} onChange={v => setTxForm({...txForm, date: v})} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Diễn giải (Hỗ trợ Quét Bill AI)</label>
            <textarea className={styles.formTextarea} placeholder="Nhập diễn giải..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} required></textarea>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className={styles.submitBtn}>
              <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thêm giao dịch'}
            </button>
            {editingItem && (
              <button type="button" onClick={() => handleDeleteTransaction(editingItem.id)} className={styles.submitBtn} style={{ background: 'rgba(255, 68, 68, 0.1)', borderColor: '#ff4444', color: '#ff4444' }}>
                <Trash2 size={18} style={{ display: 'inline', marginRight: 8 }} /> Xóa
              </button>
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
            <input type="text" className={styles.formInput} placeholder="VD: Vietcombank, Tiền mặt..." value={walletForm.name} onChange={e => setWalletForm({...walletForm, name: e.target.value})} required />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Loại</label>
              <SaoSelect
                initialValue={walletForm.type}
                options={[
                  { value: 'bank', label: 'Ngân hàng' },
                  { value: 'ewallet', label: 'Ví điện tử' },
                  { value: 'cash', label: 'Tiền mặt' }
                ]}
                onChange={v => setWalletForm({...walletForm, type: v})}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Màu sắc (Theme)</label>
              <input type="color" className={styles.formInput} style={{ padding: '0 5px' }} value={walletForm.color} onChange={e => setWalletForm({...walletForm, color: e.target.value})} required />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Số dư ban đầu (VND)</label>
            <input type="number" className={styles.formInput} placeholder="0" value={walletForm.balance} onChange={e => setWalletForm({...walletForm, balance: e.target.value})} />
          </div>
          <button type="submit" className={styles.submitBtn}>
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thêm nguồn tiền'}
          </button>
        </form>
      );
    }

    if (modalType === 'budgets') {
      return (
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tên hạn mức (Túi chi tiêu)</label>
            <input type="text" className={styles.formInput} placeholder="VD: Ăn uống, Giải trí..." defaultValue={editingItem?.name || ''} />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tháng áp dụng</label>
              <input type="month" className={styles.formInput} defaultValue={new Date().toISOString().slice(0,7)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Icon / Danh mục</label>
              <SaoSelect
                initialValue={editingItem?.category || 'food'}
                options={[
                  { value: 'food', label: 'Ăn uống' },
                  { value: 'housing', label: 'Sinh hoạt' },
                  { value: 'transport', label: 'Đi lại' },
                  { value: 'entertainment', label: 'Giải trí' },
                  { value: 'shopping', label: 'Mua sắm' }
                ]}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Số tiền giới hạn (VND)</label>
            <input type="number" className={styles.formInput} placeholder="VD: 5000000" defaultValue={editingItem?.limit || ''} />
          </div>
          <button type="submit" className={styles.submitBtn}>
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thiết lập hạn mức'}
          </button>
        </form>
      );
    }

    if (modalType === 'debt_action') {
      const isBorrowMore = debtActionType === 'borrow_more';
      const titleLabel = isBorrowMore
        ? (editingItem?.type === 'lent' ? 'Cho Vay Thêm' : 'Vay Thêm')
        : (editingItem?.type === 'lent' ? 'Thu Nợ' : 'Trả Nợ');

      return (
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Giao dịch với: <span style={{ color: '#fff' }}>{editingItem?.personName}</span></label>
            <div style={{ padding: '10px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', color: '#00f0ff', margin: '5px 0 15px' }}>
              Hành động: <strong>{titleLabel}</strong>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số tiền (VND)</label>
              <input type="number" className={styles.formInput} placeholder="VD: 500000" required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nguồn tiền</label>
              <SaoSelect
                placeholder="Chọn nguồn tiền..."
                options={wallets.map(w => ({ value: w.name, label: w.name }))}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ngày thực hiện</label>
            <SaoDatePicker defaultValue={new Date().toISOString().split('T')[0]} required />
          </div>
          <button type="submit" className={styles.submitBtn}>
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> Ghi nhận giao dịch
          </button>
        </form>
      );
    }

    if (modalType === 'debts') {
      return (
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Người vay / Chủ nợ</label>
            <input type="text" className={styles.formInput} placeholder="Tên người đó..." defaultValue={editingItem?.personName || ''} />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Loại nợ</label>
              <SaoSelect
                initialValue={editingItem?.type || 'lent'}
                options={[
                  { value: 'lent', label: 'Cho vay (Người ta nợ mình)' },
                  { value: 'borrowed', label: 'Đi vay (Mình nợ người ta)' }
                ]}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Trạng thái</label>
              <SaoSelect
                initialValue={editingItem?.status || 'unpaid'}
                options={[
                  { value: 'unpaid', label: 'Chưa trả' },
                  { value: 'partial', label: 'Trả 1 phần' },
                  { value: 'paid', label: 'Đã thanh toán' }
                ]}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Số tiền (VND)</label>
            <input type="number" className={styles.formInput} placeholder="VD: 1000000" defaultValue={editingItem?.amount || ''} />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ngày đến hạn (Tùy chọn)</label>
              <SaoDatePicker defaultValue={editingItem?.dueDate || ''} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nguồn tiền Trừ/Cộng</label>
              <SaoSelect
                placeholder="Chọn nguồn tiền"
                options={wallets.map(w => ({ value: w.name, label: w.name }))}
              />
            </div>
          </div>
          <button type="submit" className={styles.submitBtn}>
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thêm sổ nợ'}
          </button>
        </form>
      );
    }

    if (modalType === 'inventory') {
      return (
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tên món đồ / Gia vị</label>
            <input type="text" className={styles.formInput} placeholder="VD: Gạo ST25, Mì tôm..." defaultValue={editingItem?.name || ''} />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phân loại</label>
              <SaoSelect
                initialValue={editingItem?.category || 'food'}
                options={[
                  { value: 'food', label: 'Thực phẩm' },
                  { value: 'spices', label: 'Gia vị' },
                  { value: 'utilities', label: 'Đồ dùng' }
                ]}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Hạn sử dụng (Tùy chọn)</label>
              <SaoDatePicker defaultValue={editingItem?.expiryDate || ''} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số lượng</label>
              <input type="number" className={styles.formInput} placeholder="VD: 5" defaultValue={editingItem?.quantity || editingItem?.originalQuantity || ''} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Đơn vị</label>
              <input type="text" className={styles.formInput} placeholder="VD: kg, gói, chai..." defaultValue={editingItem?.unit || ''} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tổng tiền mua</label>
              <input type="number" className={styles.formInput} placeholder="Nhập 0 nếu được tặng..." defaultValue={editingItem?.totalValue || ''} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nguồn chi tiền</label>
              <SaoSelect
                initialValue={editingItem?.walletName || ''}
                placeholder="Chọn nguồn tiền"
                options={[
                  { value: 'Được tặng', label: '🎁 Được tặng (Miễn phí)' },
                  ...wallets.map(w => ({ value: w.name, label: w.name }))
                ]}
              />
            </div>
          </div>
          <button type="submit" className={styles.submitBtn}>
            <Save size={18} style={{ display: 'inline', marginRight: 8 }} /> {editingItem ? 'Lưu thay đổi' : 'Thêm vào kho'}
          </button>
        </form>
      );
    }

    return null;
  };

  return (
    <div className={styles.financeContainer}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Wallet className={styles.titleIcon} size={28} />
          <h1 className={styles.title}>Finance Center</h1>
        </div>
      </div>

      <SaoTabs
        tabs={tabs.map(t => ({ id: t.id, label: t.label, icon: <t.icon size={18} /> }))}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
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
        onClose={() => setIsModalOpen(false)}
        title={
          modalType === 'debt_action'
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
