"use client";

import { Plus, Edit3, Building2, Smartphone, Banknote, Wallet } from 'lucide-react';
import SaoButton from '../../../components/SaoButton/SaoButton';
import styles from '../finance.module.css';
import type { WalletSource } from '@/lib/types';

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

      <SaoButton
        variant="primary"
        style={{ borderRadius: '50%', width: 50, height: 50, position: 'absolute', bottom: 30, right: 30, zIndex: 100, boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)' }}
        title="Thêm nguồn tiền mới"
        onClick={onAdd}
      >
        <Plus size={32} />
      </SaoButton>
    </div>
  );
}
