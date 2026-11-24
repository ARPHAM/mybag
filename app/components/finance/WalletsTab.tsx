"use client";

import { Plus, Edit3, Building2, Smartphone, Banknote, Wallet } from 'lucide-react';
import SaoButton from '../SaoButton';
import styles from '@/app/(main)/finance/finance.module.css';
import type { WalletSource } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  wallets: WalletSource[];
  formatMoney: (n: number) => string;
  onAdd: () => void;
  onEdit: (w: WalletSource) => void;
}

function getWalletIcon(type: string) {
  switch (type) {
    case 'bank': return <Building2 size={24} />;
    case 'ewallet': return <Smartphone size={24} />;
    case 'cash': return <Banknote size={24} />;
    default: return <Wallet size={24} />;
  }
}

export default function WalletsTab({ wallets, formatMoney, onAdd, onEdit }: Props) {
  const { t } = useI18n();

  const getWalletTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return t('finance.walletTypes.bank');
      case 'ewallet': return t('finance.walletTypes.ewallet');
      case 'cash': return t('finance.walletTypes.cash');
      default: return type;
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className={styles.walletsGrid}>
        {wallets.map(wallet => (
          <div key={wallet.id} className={styles.walletCard} style={{ '--wallet-color': wallet.color } as React.CSSProperties}>
            <SaoButton variant="ghost" className={styles.editBtn} onClick={(e) => { e.stopPropagation(); onEdit(wallet); }}>
              <Edit3 size={16} />
            </SaoButton>
            <div className={styles.walletTop}>
              <div className={styles.walletName}>
                {getWalletIcon(wallet.type)}
                {wallet.name}
              </div>
              <div className={styles.walletType}>{getWalletTypeLabel(wallet.type)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#a0c4ff', textTransform: 'uppercase' }}>{t('finance.availableBalance')}</div>
              <div className={styles.walletBalance}>
                {formatMoney(wallet.balance)} <span className={styles.walletCurrency}>{t('common.currency')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SaoButton
        variant="primary"
        className={styles.overviewFab}
        title={t('finance.addWallet')}
        onClick={onAdd}
      >
        <Plus size={28} />
      </SaoButton>
    </div>
  );
}
