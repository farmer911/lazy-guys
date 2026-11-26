import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  readonly as?: 'h1' | 'h2';
}

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  icon,
  action,
  as = 'h2',
}: SectionHeaderProps) => {
  const HeadingTag = as;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow && (
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-cobalt">
            {eyebrow}
          </p>
        )}
        <HeadingTag
          className={cn(
            'flex items-center gap-2 font-semibold text-ink',
            as === 'h1' ? 'heading-h1 font-bold' : 'heading-h2'
          )}
        >
          {icon}
          <span>{title}</span>
        </HeadingTag>
        {description && <p className="max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
