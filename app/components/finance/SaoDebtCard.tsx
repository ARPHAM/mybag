"use client";

import React, { useState } from 'react';
import {
  Edit3, User, Calendar, Clock,
  CheckCircle2, Wallet, Plus, ChevronDown
} from 'lucide-react';
import SaoButton from '../SaoButton';
import styles from './SaoDebtCard.module.css';
import type { DebtItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface SaoDebtCardProps {
  debt: DebtItem;
  formatMoney: (n: number) => string;
  onEdit: (d: DebtItem) => void;
  onDebtAction: (d: DebtItem, action: 'borrow_more' | 'pay_back') => void;
}

export default function SaoDebtCard({
  debt,
  formatMoney,
  onEdit,
  onDebtAction
}: SaoDebtCardProps) {
  const { t } = useI18n();
  const [showHistory, setShowHistory] = useState(false);

  const paidAmount = Math.max(0, debt.totalAmount - debt.remainingAmount);
  const percentPaid = debt.totalAmount > 0
    ? Math.min((paidAmount / debt.totalAmount) * 100, 100)
    : 0;

  return (
    <div
      className={`${styles.card} ${styles[debt.type]} ${debt.status === 'paid' ? styles.paid : ''}`}
      onClick={() => onEdit(debt)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(debt);
        }
      }}
    >
      {/* Trục quang học mép trái phản ánh loại nợ */}
      <div className={styles.leftAccentBar} />

      {/* Con dấu hoàn tất khi đã thanh toán */}
      {debt.status === 'paid' && (
        <div className={styles.clearedStamp}>
          <span>{t('finance.cleared') || 'ĐÃ XONG'}</span>
        </div>
      )}

      {/* Header thẻ: Tên người nợ, loại nợ & Badge trạng thái, Nút edit */}
      <div className={styles.cardHeader}>
        <div className={styles.identityGroup}>
          <div className={styles.avatarBadge}>
            <User size={18} />
          </div>
          <div className={styles.nameBlock}>
            <span className={styles.personName} title={debt.personName}>
              {debt.personName}
            </span>
            <span className={styles.debtTypeLabel}>
              {debt.type === 'lent' ? t('finance.lent') : t('finance.borrowed')}
            </span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={`${styles.statusBadge} ${styles[debt.status]}`}>
            {debt.status === 'unpaid'
              ? t('finance.statusUnpaid')
              : debt.status === 'partial'
                ? t('finance.statusPartial')
                : t('finance.statusPaid')}
          </span>

          <SaoButton
            variant="ghost"
            className={styles.editBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(debt);
            }}
            title={t('common.edit')}
          >
            <Edit3 size={15} />
          </SaoButton>
        </div>
      </div>

      {/* Tiến độ thanh toán (HP Gauge) & Số tiền */}
      <div className={styles.amountSection}>
        <div className={styles.amountStatsRow}>
          <span className={styles.paidStats}>
            {t('finance.paidAmount')}: <strong>{formatMoney(paidAmount)}</strong>
          </span>
          <span className={styles.totalStats}>
            {t('finance.total')}: <strong>{formatMoney(debt.totalAmount)} {t('common.currency')}</strong>
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${percentPaid}%` }} />
        </div>

        <div className={styles.remainingRow}>
          <div className={styles.dueDateBadge}>
            {debt.status !== 'paid' ? (
              debt.dueDate ? (
                <>
                  <Calendar size={13} />
                  <span>{t('finance.dueDate')}: {debt.dueDate}</span>
                </>
              ) : null
            ) : (
              (debt.completedDate || debt.dueDate) ? (
                <span className={styles.completedText}>
                  <CheckCircle2 size={13} />
                  <span>{t('finance.completedDate')}: {debt.completedDate || debt.dueDate}</span>
                </span>
              ) : null
            )}
          </div>

          <div className={styles.remainingAmountBlock}>
            <span className={styles.remainingLabel}>{t('finance.remaining')}:</span>
            <span className={styles.remainingValue}>{formatMoney(debt.remainingAmount)}</span>
            <span className={styles.remainingUnit}>{t('common.currency')}</span>
          </div>
        </div>
      </div>

      {/* Lịch sử giao dịch (Accordion HUD mượt mà) */}
      {debt.history && debt.history.length > 0 && (
        <div className={styles.historySection} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.historyToggleBtn}
            onClick={() => setShowHistory(!showHistory)}
          >
            <div className={styles.historyToggleTitle}>
              <Clock size={13} />
              <span>{t('finance.debtHistory')} ({debt.history.length})</span>
            </div>
            <ChevronDown size={14} className={`${styles.historyChevron} ${showHistory ? styles.chevronOpen : ''}`} />
          </button>

          {showHistory && (
            <div className={styles.historyList}>
              {debt.history.map(h => (
                <div key={h.id} className={styles.historyRecord}>
                  <div className={styles.recordLeft}>
                    <span className={styles.recordDate}>{h.date}</span>
                    <span className={styles.recordWallet}>
                      <Wallet size={12} />
                      <span>{h.walletName}</span>
                    </span>
                    {h.note && <span className={styles.recordNote}>({h.note})</span>}
                  </div>
                  <span className={`${styles.recordAmount} ${styles[h.type]}`}>
                    {h.type === 'pay_back'
                      ? (debt.type === 'lent' ? '+' : '-')
                      : (debt.type === 'lent' ? '-' : '+')}
                    {formatMoney(h.amount)} {t('common.currency')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cụm 2 nút tương tác hành động nhanh ở cuối */}
      {debt.status !== 'paid' && (
        <div className={styles.actionButtonsRow} onClick={(e) => e.stopPropagation()}>
          <SaoButton
            variant="primary"
            className={styles.actionBtn}
            onClick={() => onDebtAction(debt, 'pay_back')}
          >
            <CheckCircle2 size={15} />
            <span>{debt.type === 'lent' ? t('finance.collectDebt') : t('finance.payDebt')}</span>
          </SaoButton>

          <SaoButton
            variant="default"
            className={styles.actionBtn}
            onClick={() => onDebtAction(debt, 'borrow_more')}
          >
            <Plus size={15} />
            <span>{debt.type === 'lent' ? t('finance.lendMore') : t('finance.borrowMore')}</span>
          </SaoButton>
        </div>
      )}
    </div>
  );
}