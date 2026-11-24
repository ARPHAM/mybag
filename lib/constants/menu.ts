import { History, Package, Utensils } from 'lucide-react';
import { MenuTabId } from '../types';

export const MENU_TABS: { id: MenuTabId; label: string; icon: any }[] = [
  { id: 'history', label: 'Lịch Sử', icon: History },
  { id: 'inventory', label: 'Dự Trữ', icon: Package },
  { id: 'recipes', label: 'Công Thức', icon: Utensils },
];

export function getMenuTabs(t?: (key: any) => string): { id: MenuTabId; label: string; icon: any }[] {
  if (!t) return MENU_TABS;
  return [
    { id: 'history', label: t('menu.mealsTab'), icon: History },
    { id: 'inventory', label: t('menu.inventoryTab'), icon: Package },
    { id: 'recipes', label: t('menu.recipesTab'), icon: Utensils },
  ];
}
