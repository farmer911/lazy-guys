import type { ReactNode } from 'react';

interface SectionHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
}

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  icon,
  action,
}: SectionHeaderProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="space-y-1">
      {eyebrow && (
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-cobalt">
          {eyebrow}
        </p>
      )}
      <h2 className="heading-h2 flex items-center gap-2 font-semibold text-ink">
        {icon}
        <span>{title}</span>
      </h2>
      {description && <p className="max-w-2xl text-sm text-ink-muted">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
