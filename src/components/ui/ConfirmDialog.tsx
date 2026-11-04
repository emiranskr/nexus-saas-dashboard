'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Evet, Onayla',
  cancelLabel = 'Vazgeç',
  variant = 'destructive',
  isLoading = false,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDestructive
                ? 'bg-destructive/15 text-destructive'
                : 'bg-primary/15 text-primary'
            }`}
          >
            {isDestructive ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <HelpCircle className="h-5 w-5" />
            )}
          </div>
          <DialogPrimitive.Description className="text-sm text-muted-foreground leading-relaxed pt-1">
            {description}
          </DialogPrimitive.Description>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
