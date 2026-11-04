'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  isLoading?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  isLoading = false,
}: ModalProps) {
  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        {/* Backdrop Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in" />

        {/* Centered Scrollable Container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-none">
          <DialogPrimitive.Content
            onEscapeKeyDown={(e) => {
              if (isLoading) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (isLoading) e.preventDefault();
            }}
            className={cn(
              'pointer-events-auto relative w-full rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto focus:outline-none',
              maxWidth
            )}
          >
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div>
                <DialogPrimitive.Title className="text-lg font-bold text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="text-sm text-muted-foreground mt-0.5">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  disabled={isLoading}
                  aria-label="Kapat"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogPrimitive.Close>
            </div>

            <div>{children}</div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
