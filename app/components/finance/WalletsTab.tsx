"use client";

import SaoFab from '../SaoFab';
import SaoWalletCard from './SaoWalletCard';
import styles from '@/app/(main)/finance/finance.module.css';
import type { WalletSource } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  wallets: WalletSource[];
  formatMoney: (n: number) => string;
  onAdd: () => void;
  onEdit: (w: WalletSource) => void;
}

export default function WalletsTab({ wallets, formatMoney, onAdd, onEdit }: Props) {
  const { t } = useI18n();

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className={styles.walletsGrid}>
        {wallets.map(wallet => (
          <SaoWalletCard
            key={wallet.id}
            wallet={wallet}
            formatMoney={formatMoney}
            onEdit={onEdit}
          />
        ))}
      </div>

      <SaoFab
        title={t('finance.addWallet')}
        onClick={onAdd}
        position="fixed"
      />
    </div>
  );
}
