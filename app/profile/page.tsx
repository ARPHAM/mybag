"use client";

import { useState } from 'react';
import { User, Shield, Crosshair, Map, Settings, MessageSquare, Package, Search, FlaskConical, Sword, Gem, Leaf, Info } from 'lucide-react';
import styles from './profile.module.css';

export default function SAOProfilePage() {
  const [activeMenu, setActiveMenu] = useState('profile');

  const menuItems = [
    { id: 'profile', icon: User, label: 'Player Info' },
    { id: 'items', icon: Package, label: 'Items' },
    { id: 'skills', icon: Crosshair, label: 'Skills' },
    { id: 'map', icon: Map, label: 'Map' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const inventoryItems = [
    { id: 1, name: 'Healing Potion', quantity: 15, icon: FlaskConical },
    { id: 2, name: 'Elucidator', quantity: 1, icon: Sword },
    { id: 3, name: 'Teleport Crystal', quantity: 3, icon: Gem },
    { id: 4, name: 'Ragout Rabbit Meat', quantity: 1, icon: Leaf },
    { id: 5, name: 'Antidote Potion', quantity: 8, icon: FlaskConical },
    { id: 6, name: 'Yggdrasil Seed', quantity: 1, icon: Leaf },
  ];

  return (
    <div className={styles.saoContainer}>
      <div className={styles.saoWindow}>
        {/* Main Menu Ring */}
        <div className={styles.mainMenu}>
          {menuItems.map((item) => (
            <div 
              key={item.id}
              className={`${styles.menuIcon} ${activeMenu === item.id ? styles.active : ''}`}
              onClick={() => setActiveMenu(item.id)}
              title={item.label}
            >
              {activeMenu === item.id && <div className={styles.crystalCursor} />}
              <item.icon size={26} strokeWidth={1.5} />
            </div>
          ))}
        </div>

        {/* Status Panel */}
        <div className={styles.statusPanel}>
          <div className={styles.panelHeader}>
            Main Menu / {menuItems.find(m => m.id === activeMenu)?.label}
          </div>
          
          <div className={styles.panelContent}>
            
            {activeMenu === 'profile' && (
              <>
                <div className={styles.identitySection}>
                  <div className={styles.playerName}>Kirito</div>
                  <div className={styles.playerLevel}>Lv. 96</div>
                </div>

                <div className={styles.hpContainer}>
                  <div className={styles.hpLabel}>
                    <span>HP</span>
                    <span>18500 / 18500</span>
                  </div>
                  <div className={styles.hpBarWrapper}>
                    <div className={styles.hpBarFill} style={{ width: '100%' }} />
                    <span className={styles.hpText}>100%</span>
                  </div>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>STR</span>
                    <span className={styles.statValue}>108</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>AGI</span>
                    <span className={styles.statValue}>124</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>VIT</span>
                    <span className={styles.statValue}>88</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>DEX</span>
                    <span className={styles.statValue}>95</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Exp</span>
                    <span className={styles.statValue}>1,452,090</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Next Lv</span>
                    <span className={styles.statValue}>23,500</span>
                  </div>
                </div>

                <div className={styles.equipmentSection}>
                  <div className={styles.sectionTitle}>Equipment</div>
                  <div className={styles.equipGrid}>
                    <div className={styles.equipSlot} title="Weapon: Elucidator">
                      <Shield size={32} strokeWidth={1.2} />
                    </div>
                    <div className={styles.equipSlot} title="Off-hand: Dark Repulser">
                      <Shield size={32} strokeWidth={1.2} />
                    </div>
                    <div className={styles.equipSlot} title="Armor: Black Wyrm Coat">
                      <User size={32} strokeWidth={1.2} />
                    </div>
                    <div className={styles.equipSlot} title="Accessory">
                      <Search size={32} strokeWidth={1.2} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeMenu === 'items' && (
              <>
                <div className={styles.sectionTitle}>Inventory</div>
                <div className={styles.itemList}>
                  {inventoryItems.map((item) => (
                    <div key={item.id} className={styles.itemRow}>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemIcon}>
                          <item.icon size={24} strokeWidth={1.5} />
                        </div>
                        <span className={styles.itemName}>{item.name}</span>
                      </div>
                      <span className={styles.itemQuantity}>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeMenu !== 'profile' && activeMenu !== 'items' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', gap: '15px' }}>
                <Info size={48} strokeWidth={1} />
                <p>This menu is currently locked or under development.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
