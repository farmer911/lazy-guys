import { cn } from '@/lib/utils';

interface SkeletonProps {
  readonly className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={cn('animate-pulse rounded-xl border border-subtle bg-surface-subtle/70', className)}
  />
);
