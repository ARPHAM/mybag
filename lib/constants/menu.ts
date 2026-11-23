import { History, Package, Utensils } from 'lucide-react';
import { MenuTabId } from '../types';

export const MENU_TABS: { id: MenuTabId; label: string; icon: any }[] = [
  { id: 'history', label: 'Lịch Sử', icon: History },
  { id: 'inventory', label: 'Dự Trữ', icon: Package },
  { id: 'recipes', label: 'Công Thức', icon: Utensils },
];
