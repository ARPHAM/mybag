"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type AlertType = 'alert' | 'confirm';

interface AlertState {
  isOpen: boolean;
  type: AlertType;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  alertState: AlertState;
  showAlert: (message: string, onConfirm?: () => void) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    type: 'alert',
    message: ''
  });

  const showAlert = (message: string, onConfirm?: () => void) => {
    setAlertState({
      isOpen: true,
      type: 'alert',
      message,
      onConfirm
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setAlertState({
      isOpen: true,
      type: 'confirm',
      message,
      onConfirm,
      onCancel
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AlertContext.Provider value={{ alertState, showAlert, showConfirm, closeAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useSaoAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useSaoAlert must be used within an AlertProvider');
  }
  return context;
}
