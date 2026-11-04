'use client';

import * as React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string) => string;
    error: (title: string, description?: string) => string;
    warning: (title: string, description?: string) => string;
    info: (title: string, description?: string) => string;
  };
}

export const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastContainer() {
  const context = React.useContext(ToastContext);
  if (!context || context.toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bildirimler"
      className="fixed bottom-4 right-4 z-50 flex max-w-md w-full flex-col gap-2.5 pointer-events-none p-4 sm:p-0"
    >
      {context.toasts.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onClose={() => context.removeToast(item.id)}
        />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />,
    info: <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-card/95 shadow-emerald-500/10',
    error: 'border-rose-500/30 bg-card/95 shadow-rose-500/10',
    warning: 'border-amber-500/30 bg-card/95 shadow-amber-500/10',
    info: 'border-sky-500/30 bg-card/95 shadow-sky-500/10',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in',
        borders[item.type]
      )}
    >
      <div className="pt-0.5">{icons[item.type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground tracking-tight">
          {item.title}
        </h4>
        {item.description && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed break-words">
            {item.description}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Kapat"
        className="rounded-lg p-1 text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
