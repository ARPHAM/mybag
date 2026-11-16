"use client";

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Wallet, ArrowDownRight, ArrowUpRight, ArrowRightLeft, Users, CalendarDays, HandCoins, CreditCard, Pencil, Trash2, ShoppingBag, Package } from 'lucide-react';
import { formatVnIsoString, getYuiActionScheduleDisplay } from '@/lib/vnTime';
import SaoModal from '../../../components/SaoModal/SaoModal';
import SaoButton from '../../../components/SaoButton/SaoButton';
import SaoInput from '../../../components/SaoInput/SaoInput';
import { useSaoAlert } from '../../../contexts/AlertContext';
import { parseSmartExpense, executeSmartExpense } from '../api';

interface SmartExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  formatMoney: (n: number) => string;
}

export default function SmartExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  formatMoney
}: SmartExpenseModalProps) {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string>('');

  const { showAlert } = useSaoAlert();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setParsedResult(null);
    try {
      const res: any = await parseSmartExpense(inputText);
      if (res?.success && res?.data) {
        setParsedResult(res.data);
        setAnalyzedAt(formatVnIsoString(new Date()));
      } else {
        showAlert("Không thể phân tích dữ liệu, vui lòng kiểm tra lại câu nhập");
      }
    } catch (err: any) {
      console.error(err);
      showAlert(err.response?.data?.error || "Lỗi kết nối AI");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    if (!parsedResult?.actions || parsedResult.actions.length === 0) return;

    setIsExecuting(true);
    try {
      const res: any = await executeSmartExpense(parsedResult.actions);
      if (res?.success) {
        showAlert(`🎉 ${res.message || 'Thực hiện thành công!'}`);
        window.dispatchEvent(new CustomEvent('sao-user-updated'));
        window.dispatchEvent(new CustomEvent('sao-shopping-updated'));
        window.dispatchEvent(new CustomEvent('sao-inventory-updated'));
        window.dispatchEvent(new CustomEvent('sao-health-updated'));
        window.dispatchEvent(new CustomEvent('sao-tasks-updated'));
        window.dispatchEvent(new CustomEvent('sao-calendar-updated'));
        window.dispatchEvent(new CustomEvent('sao-menu-updated'));
        handleClose();
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      showAlert(err.response?.data?.error || "Lỗi khi ghi nhận dữ liệu");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setInputText('');
    setParsedResult(null);
    onClose();
  };

  const examplePrompts = [
    "trả 80k bằng mb, trong đó 40k tôi ăn bún đậu mắm tôm, còn 40k trả hộ anh Tiệp",
    "đổ xăng 70k bằng tiền mặt",
    "mua sách 120k và trà sữa 35k bằng momo"
  ];

  return (
    <SaoModal
      isOpen={isOpen}
      onClose={handleClose}
      title="SAO Smart Command (Ghi chép AI)"
      icon={<Sparkles size={20} color="#00f0ff" />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: '#a0c4ff', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
          Nhập câu nói tự nhiên, AI sẽ tự động phân tích bóc tách các khoản chi tiêu, ghi nợ trả hộ và so khớp đúng ví của bạn trong một lần duy nhất.
        </p>

        {/* Example prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {examplePrompts.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputText(example)}
              style={{
                background: 'rgba(0, 240, 255, 0.08)',
                border: '1px solid rgba(0, 240, 255, 0.25)',
                color: '#a0c4ff',
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              "{example}"
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="VD: trả 80k bằng mb, trong đó 40k tôi ăn bún đậu mắm tôm, còn 40k trả hộ anh Tiệp..."
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(0, 10, 25, 0.7)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '4px',
              padding: '10px',
              color: '#fff',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <SaoButton
              type="submit"
              variant="primary"
              disabled={isAnalyzing || !inputText.trim()}
              style={{ minWidth: '130px' }}
            >
              {isAnalyzing ? 'Đang phân tích...' : 'Phân tích (AI Parse)'}
            </SaoButton>
          </div>
        </form>

        {/* Parsed Result Preview */}
        {parsedResult && (
          <div style={{
            background: 'rgba(5, 18, 35, 0.85)',
            border: '1px solid #00f0ff',
            borderRadius: '4px',
            padding: '16px',
            marginTop: '8px',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#00ffaa" />
              <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>
                KẾT QUẢ BÓC TÁCH TỰ ĐỘNG
              </span>
            </div>

            <div style={{ color: '#a0c4ff', fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
              "{parsedResult.summary}"
            </div>

            {parsedResult.matched_wallet && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#fff' }}>
                <Wallet size={16} color="var(--sao-primary-hex)" />
                <span>Ví áp dụng: <strong style={{ color: 'var(--sao-primary-hex)' }}>{parsedResult.matched_wallet.name}</strong></span>
              </div>
            )}

            {/* Actions breakdown list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {parsedResult.actions?.map((act: any, idx: number) => {
                const t = act.actionType;
                const isExp = t === 'expense' || t === 'meal' || t === 'purchase_shopping';
                const isInc = t === 'income';
                const isTransfer = t === 'transfer';
                const isDebtLent = t === 'debt_lent';
                const isDebtBorrow = t === 'debt_borrowed';
                const isPayDebt = t === 'pay_debt';
                const isPayDebtIn = isPayDebt && act.debt_type === 'lent';
                const isBudget = t === 'upsert_budget';
                const isUpdateTx = t === 'update_transaction';
                const isDeleteTx = t === 'delete_transaction';
                const isInv = t === 'create_inventory' || t === 'update_inventory';
                const schedule = getYuiActionScheduleDisplay(act, analyzedAt);
                const destWalletName = act.toWalletName || act.to_wallet_name;

                const titleText = (() => {
                  if (t === 'pay_debt') return `${isPayDebtIn ? 'Thu nợ từ' : 'Trả nợ cho'} ${act.person || 'đối tượng'}`;
                  if (t === 'upsert_budget') return `Hạn mức: ${act.name || act.category}`;
                  if (t === 'update_transaction') return `Sửa GD: ${act.description || 'Giao dịch'}`;
                  if (t === 'delete_transaction') return `Xóa GD: ${act.description || 'Giao dịch'}`;
                  if (t === 'purchase_shopping') return `Đã mua: ${act.name} (${act.quantity || 1} ${act.unit || 'món'})`;
                  if (t === 'update_inventory' || t === 'create_inventory') return `Kho đồ: ${act.name}`;
                  return act.food_name || act.description || act.title || 'Hành động';
                })();

                const subText = (() => {
                  if (isDebtLent) return `Cho vay / Trả hộ: ${act.person || 'Người quen'}${act.walletName ? ` · Ví: ${act.walletName}` : ''}`;
                  if (isDebtBorrow) return `Đi vay: ${act.person || 'Chủ nợ'}${act.walletName ? ` · Ví: ${act.walletName}` : ''}`;
                  if (isPayDebt) return `${isPayDebtIn ? 'Nhận tiền trả nợ' : 'Trả tiền nợ'}${act.walletName ? ` · Ví: ${act.walletName}` : ''}`;
                  if (isBudget) return `Danh mục: ${act.category}`;
                  if (isUpdateTx) return `Cập nhật giao dịch${act.walletName ? ` · Ví: ${act.walletName}` : ''}`;
                  if (isDeleteTx) return 'Xóa giao dịch & hoàn ví';
                  if (t === 'purchase_shopping') return `${act.add_to_inventory === false ? 'Tick danh sách' : 'Tick shopping + Nhập kho'}${act.walletName ? ` · Ví: ${act.walletName}` : ''}`;
                  if (isInv) return 'Cập nhật kho dự trữ';
                  if (isTransfer) return `Chuyển ví: ${act.walletName || '?'} → ${destWalletName || '?'}`;
                  if (isExp) return `Danh mục: ${act.category || 'Ăn uống'}${act.walletName ? ` · Ví: ${act.walletName}` : ''}`;
                  if (isInc) return `Thu nhập${act.walletName ? ` · Ví: ${act.walletName}` : ''}`;
                  return act.walletName ? `Ví: ${act.walletName}` : 'Hành động AI';
                })();

                const displayValue = isBudget ? (act.limit ?? 0) : (act.amount || 0);
                const showAmount = isBudget ? act.limit !== undefined : displayValue > 0;
                const isPositive = isInc || isDebtBorrow || isPayDebtIn;
                const isNeutral = isTransfer || isBudget || isUpdateTx || isDeleteTx;

                return (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(0, 25, 45, 0.5)',
                      border: '1px solid rgba(var(--sao-primary-rgb), 0.25)',
                      borderRadius: '4px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isExp && t !== 'purchase_shopping' && <ArrowDownRight size={18} color="#ff4444" />}
                      {t === 'purchase_shopping' && <ShoppingBag size={18} color="#4ade80" />}
                      {isInc && <ArrowUpRight size={18} color="#00ffaa" />}
                      {isTransfer && <ArrowRightLeft size={18} color="#00f0ff" />}
                      {(isDebtLent || isDebtBorrow) && <Users size={18} color="#c084fc" />}
                      {isPayDebt && <HandCoins size={18} color="#c084fc" />}
                      {isBudget && <CreditCard size={18} color="#38bdf8" />}
                      {isUpdateTx && <Pencil size={18} color="#fbbf24" />}
                      {isDeleteTx && <Trash2 size={18} color="#ff6666" />}
                      {isInv && <Package size={18} color="#fb923c" />}

                      <div>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                          {titleText}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a0c4ff' }}>
                          {subText}
                        </div>
                        {schedule && (
                          <div style={{ fontSize: '0.74rem', color: '#ffd6f0', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                            <CalendarDays size={12} color="#ffb6e6" />
                            <span>{schedule.label}: <strong>{schedule.value}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {showAmount && (
                      <div style={{
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        color: isNeutral ? '#00f0ff' : (isPositive ? '#00ffaa' : '#ff4444'),
                        whiteSpace: 'nowrap'
                      }}>
                        {isNeutral ? '' : (isPositive ? '+' : '-')}{formatMoney(displayValue)} VND
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Execute Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(0,240,255,0.2)', paddingTop: '12px' }}>
              <SaoButton variant="default" onClick={() => setParsedResult(null)} type="button">
                Hủy bỏ
              </SaoButton>
              <SaoButton
                variant="primary"
                onClick={handleExecute}
                disabled={isExecuting}
                style={{ minWidth: '150px' }}
              >
                {isExecuting ? 'Đang thực hiện...' : 'Xác nhận thực hiện'}
              </SaoButton>
            </div>
          </div>
        )}
      </div>
    </SaoModal>
  );
}
