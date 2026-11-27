import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-label text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-on-primary shadow-sm hover:bg-primary-dim',
        secondary: 'bg-surface-low text-on-surface hover:bg-surface-container',
        subtle: 'bg-surface-container text-on-surface hover:bg-surface-high',
        outline:
          'border border-outline-variant/40 bg-surface-lowest text-on-surface shadow-xs hover:bg-surface-low hover:text-primary',
        ghost: 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface',
        destructive: 'bg-error text-on-error shadow-sm hover:bg-error-dim',
      },
      size: {
        default: 'min-h-11 px-4 py-2 text-xs sm:min-h-10 sm:text-sm',
        sm: 'min-h-11 rounded-lg px-3.5 text-xs sm:min-h-9',
        lg: 'h-12 rounded-xl px-6 text-sm sm:text-base',
        icon: 'h-11 w-11 rounded-lg sm:h-9 sm:w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = 'Button';
