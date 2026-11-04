'use client';

import * as React from 'react';
import { ToastContext, ToastItem, ToastContainer } from './Toast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const duration = toast.duration ?? 4000;

      const newToast: ToastItem = { ...toast, id };
      setToasts((prev) => [...prev.slice(-4), newToast]); // En fazla 5 toast göster

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const toast = React.useMemo(
    () => ({
      success: (title: string, description?: string) =>
        addToast({ type: 'success', title, description }),
      error: (title: string, description?: string) =>
        addToast({ type: 'error', title, description, duration: 6000 }),
      warning: (title: string, description?: string) =>
        addToast({ type: 'warning', title, description }),
      info: (title: string, description?: string) =>
        addToast({ type: 'info', title, description }),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}
