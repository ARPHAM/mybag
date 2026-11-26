"use client";

import React from 'react';
import { Edit3, Landmark, Smartphone, Banknote, Wallet } from 'lucide-react';
import SaoButton from '../SaoButton';
import styles from './SaoWalletCard.module.css';
import type { WalletSource } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface SaoWalletCardProps {
  wallet: WalletSource;
  formatMoney: (n: number) => string;
  onEdit: (wallet: WalletSource) => void;
}

/**
 * Tự động nhận diện loại ví dựa trên tên và thuộc tính type,
 * giải quyết triệt để trường hợp tên là 'Tiền mặt' nhưng type bị lưu nhầm thành 'bank'.
 */
function resolveWalletType(wallet: WalletSource): 'bank' | 'ewallet' | 'cash' {
  const name = (wallet.name || '').toLowerCase().trim();
  if (
    name.includes('tiền mặt') ||
    name.includes('tien mat') ||
    name.includes('cash') ||
    name.includes('heo đất') ||
    name.includes('túi tiền')
  ) {
    return 'cash';
  }
  if (
    name.includes('momo') ||
    name.includes('shopee') ||
    name.includes('zalopay') ||
    name.includes('zalo') ||
    name.includes('viettel') ||
    name.includes('vnpay')
  ) {
    return 'ewallet';
  }
  if (
    name.includes('bank') ||
    name.includes('ngân hàng') ||
    name.includes('vcb') ||
    name.includes('tcb') ||
    name.includes('mb') ||
    name.includes('bidv') ||
    name.includes('vietin') ||
    name.includes('acb') ||
    name.includes('tpbank') ||
    name.includes('vpbank')
  ) {
    return 'bank';
  }
  return wallet.type || 'bank';
}

function getWalletIcon(type: 'bank' | 'ewallet' | 'cash' | string) {
  switch (type) {
    case 'bank':
      return <Landmark size={18} />;
    case 'ewallet':
      return <Smartphone size={18} />;
    case 'cash':
      return <Banknote size={18} />;
    default:
      return <Wallet size={18} />;
  }
}

export default function SaoWalletCard({ wallet, formatMoney, onEdit }: SaoWalletCardProps) {
  const { t } = useI18n();
  const effectiveType = resolveWalletType(wallet);

  const getWalletTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return t('finance.walletTypes.bank');
      case 'ewallet': return t('finance.walletTypes.ewallet');
      case 'cash': return t('finance.walletTypes.cash');
      default: return type;
    }
  };

  return (
    <div
      className={styles.card}
      style={{ '--wallet-color': wallet.color || 'var(--sao-primary-hex)' } as React.CSSProperties}
      onClick={() => onEdit(wallet)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(wallet);
        }
      }}
    >
      {/* Cột năng lượng quang học mép trái */}
      <div className={styles.leftAccentBar} />

      {/* Cụm ngàm cơ khí góc trên - trái */}
      <div className={styles.cornerBracketTopLeft}>
        <div className={styles.topLeftBevelLine} />
        <div className={styles.bracketStripes} />
        <div className={styles.bracketDiamond} />
      </div>

      {/* Header thẻ ví: icon, tên và loại */}
      <div className={styles.cardHeader}>
        <div className={styles.walletIdentity}>
          <div className={styles.iconBadge}>
            {getWalletIcon(effectiveType)}
          </div>
          <div className={styles.nameContainer}>
            <span className={styles.walletName} title={wallet.name}>
              {wallet.name}
            </span>
            <span className={styles.walletTypeBadge}>
              {getWalletTypeLabel(effectiveType)}
            </span>
          </div>
        </div>

        <SaoButton
          variant="ghost"
          className={styles.editBtn}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(wallet);
          }}
          title={t('common.edit')}
        >
          <Edit3 size={15} />
        </SaoButton>
      </div>

      {/* Section số dư (đã bỏ dòng nhãn SỐ DƯ KHẢ DỤNG thừa) */}
      <div className={styles.balanceSection}>
        <div className={styles.balanceAmountWrapper}>
          <span className={styles.balanceAmount}>{formatMoney(wallet.balance)}</span>
          <span className={styles.currency}>{t('common.currency')}</span>
        </div>
      </div>

      {/* Cụm ngàm cơ khí góc dưới - phải */}
      <div className={styles.cornerBracketBottomRight}>
        <div className={styles.bottomRightBevelLine} />
        <div className={styles.bottomRightDiamond} />
      </div>
    </div>
  );
}
