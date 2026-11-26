import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-cobalt/25 bg-cobalt-tint text-cobalt',
        emerald: 'border-status-ok/30 bg-status-ok/10 text-status-ok',
        mono: 'rounded-md border-subtle bg-surface-subtle px-2 py-0.5 font-mono text-[11px] text-ink-secondary',
        secondary: 'border-subtle bg-surface-subtle text-ink-secondary',
        destructive: 'border-status-err/30 bg-status-err/10 text-status-err',
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
