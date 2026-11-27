import { Gauge } from 'lucide-react';
import type { KpiMetric } from '@contracts/portfolio';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from '@/i18n/translations';

interface KpiMetricCardProps {
  readonly metric: KpiMetric;
}

export const KpiMetricCard = ({ metric }: KpiMetricCardProps) => {
  const t = useTranslations();

  return (
    <Card className="group h-full transition-shadow hover:shadow-xl">
      <CardContent className="flex h-full flex-col justify-between gap-4 pt-6">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="stat-kpi font-bold text-primary">{metric.value}</span>
            <span className="rounded-lg bg-surface-low p-2 text-primary transition-transform group-hover:scale-105">
              <Gauge className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 font-mono text-xs font-semibold text-on-surface">{metric.label}</p>
          <p className="mt-2.5 text-xs leading-relaxed text-on-surface-variant">{metric.detail}</p>
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
          <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-[10px] font-medium text-on-surface-variant">
            {t.about.verifiedMetric}
          </span>
          <svg
            aria-hidden="true"
            className="h-5 w-16 text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 64 20"
          >
            <path
              d="M0 16 L12 14 L24 17 L36 9 L48 8 L64 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};
