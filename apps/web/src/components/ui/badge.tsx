import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary-container/25 text-on-primary-container dark:bg-primary/15 dark:text-primary',
        emerald: 'border-status-ok/30 bg-status-ok-bg text-status-ok',
        mono: 'rounded-md border-outline-variant/25 bg-surface-low px-2 py-0.5 font-mono text-[11px] text-on-surface-variant',
        secondary: 'border-outline-variant/30 bg-secondary-container/40 text-on-secondary-container',
        destructive: 'border-error/30 bg-error-bg text-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
