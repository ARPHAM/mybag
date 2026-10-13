"use client";

import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Wallet, ArrowDownRight, ArrowUpRight, Users } from 'lucide-react';
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
                const isExp = act.actionType === 'expense';
                const isInc = act.actionType === 'income';
                const isDebtLent = act.actionType === 'debt_lent';
                const isDebtBorrow = act.actionType === 'debt_borrowed';

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
                      {isExp && <ArrowDownRight size={18} color="#ff4444" />}
                      {isInc && <ArrowUpRight size={18} color="#00ffaa" />}
                      {(isDebtLent || isDebtBorrow) && <Users size={18} color="#c084fc" />}

                      <div>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                          {act.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a0c4ff' }}>
                          {isDebtLent && `Cho vay / Trả hộ: ${act.person || 'Người quen'}`}
                          {isDebtBorrow && `Đi vay: ${act.person || 'Chủ nợ'}`}
                          {isExp && `Danh mục: ${act.category || 'Ăn uống'}`}
                          {isInc && `Thu nhập`}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      color: isExp || isDebtLent ? '#ff4444' : '#00ffaa',
                      whiteSpace: 'nowrap'
                    }}>
                      {isExp || isDebtLent ? '-' : '+'}{formatMoney(act.amount)} VND
                    </div>
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
