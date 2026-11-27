import { cn } from '@/lib/utils';

interface SkeletonProps {
  readonly className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={cn(
      'animate-pulse rounded-2xl border border-outline-variant/20 bg-surface-container/60',
      className
    )}
  />
);
