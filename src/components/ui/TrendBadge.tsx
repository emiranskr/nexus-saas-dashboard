import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendBadgeProps {
  value: number;
  label?: string;
  className?: string;
}

export function TrendBadge({ value, label = 'önceki döneme göre', className }: TrendBadgeProps) {
  const isZero = value === 0;
  const isPositive = value > 0;
  const isNegative = value < 0;

  let text = '%0';
  if (isPositive) text = `+%${value}`;
  else if (isNegative) text = `-%${Math.abs(value)}`;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs mt-2', className)}>
      <span
        className={cn(
          'inline-flex items-center font-bold px-1.5 py-0.5 rounded-md text-xs transition-colors',
          isPositive && 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
          isNegative && 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20',
          isZero && 'text-muted-foreground bg-accent/60 border border-border'
        )}
      >
        {isPositive && <TrendingUp className="h-3 w-3 mr-1 shrink-0" />}
        {isNegative && <TrendingDown className="h-3 w-3 mr-1 shrink-0" />}
        {isZero && <Minus className="h-3 w-3 mr-1 shrink-0" />}
        {text}
      </span>
      {label && <span className="text-muted-foreground text-[11px] truncate">{label}</span>}
    </div>
  );
}
