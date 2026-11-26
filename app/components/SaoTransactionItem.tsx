"use client";

import React from 'react';
import { Wallet, Edit3, Trash2 } from 'lucide-react';
import SaoButton from './SaoButton';
import styles from './SaoTransactionItem.module.css';

export interface SaoTransactionItemProps {
  title: string;
  date?: string;
  amount: number;
  currency?: string;
  type?: 'expense' | 'income' | 'transfer';
  walletName?: string;
  rank?: number;
  percentage?: number;
  categoryColor?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  className?: string;
  formatMoney?: (n: number) => string;
}

export default function SaoTransactionItem({
  title,
  date,
  amount,
  currency = 'VND',
  type = 'expense',
  walletName,
  rank,
  percentage,
  icon,
  actions,
  onEdit,
  onDelete,
  onClick,
  className = '',
  formatMoney = (n: number) => n.toLocaleString('vi-VN')
}: SaoTransactionItemProps) {
  const isRank1 = rank === 1;
  const isExpense = type === 'expense';
  const isIncome = type === 'income';

  const getBarClass = () => {
    if (isRank1) return styles.barGold;
    if (isExpense) return styles.barRed;
    if (isIncome) return styles.barGreen;
    return styles.barCyan;
  };

  const getAmountClass = () => {
    if (isExpense) return styles.amountExpense;
    if (isIncome) return styles.amountIncome;
    return styles.amountTransfer;
  };

  const getAmountPrefix = () => {
    if (isExpense) return '-';
    if (isIncome) return '+';
    return '';
  };

  return (
    <div
      className={`${styles.itemRow} ${isRank1 ? styles.rank1 : ''} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
    >
      {/* Vạch viền quang học thẳng chỉ báo bên trái */}
      <div className={`${styles.leftAccentBar} ${getBarClass()}`} />

      {/* Cụm thông tin bên trái */}
      <div className={styles.leftContent}>
        {/* Icon chỉ báo loại giao dịch hoặc danh mục (nếu có) */}
        {icon && (
          <div className={`${styles.iconBadge} ${styles[type]}`}>
            {icon}
          </div>
        )}

        {/* Huy hiệu thứ tự (nếu có rank) */}
        {rank !== undefined && (
          <div className={`${styles.rankBadge} ${isRank1 ? styles.rankBadge1 : ''}`}>
            #{rank}
          </div>
        )}

        <div className={styles.infoCol}>
          <div className={styles.titleText} title={title}>
            {title}
          </div>

          <div className={styles.metaRow}>
            {date && <span className={styles.dateText}>{date}</span>}

            {walletName && (
              <span className={styles.walletBadge}>
                <Wallet size={10} className={styles.walletIcon} />
                <span>{walletName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cụm số tiền, huy hiệu % & nút thao tác bên phải */}
      <div className={styles.rightContent}>
        <div className={styles.amountCol}>
          <div className={`${styles.amountText} ${getAmountClass()}`}>
            {getAmountPrefix()}{formatMoney(Math.abs(amount))}
            <span className={styles.currencyText}>{currency}</span>
          </div>

          {/* Huy hiệu % chi tiêu HUD gọn gàng */}
          {percentage !== undefined && (
            <div className={`${styles.percentageBadge} ${isRank1 ? styles.percentGold : ''}`}>
              <span className={styles.percentageDot} />
              <span>{percentage}%</span>
            </div>
          )}
        </div>

        {/* Cụm nút hành động (sửa / xóa) */}
        {(onEdit || onDelete || actions) && (
          <div className={styles.actionBtns}>
            {actions}
            {onEdit && (
              <SaoButton
                variant="ghost"
                className={styles.rowActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                title="Sửa"
              >
                <Edit3 size={13} />
              </SaoButton>
            )}
            {onDelete && (
              <SaoButton
                variant="ghost"
                ghostType="danger"
                className={styles.rowActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Xóa"
              >
                <Trash2 size={13} />
              </SaoButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
