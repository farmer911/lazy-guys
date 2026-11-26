import type { KpiMetric } from '@contracts/portfolio';
import { Card, CardContent } from '@/components/ui/card';

interface KpiMetricCardProps {
  readonly metric: KpiMetric;
}

export const KpiMetricCard = ({ metric }: KpiMetricCardProps) => (
  <Card className="h-full">
    <CardContent className="flex h-full flex-col justify-between gap-2 pt-5 sm:pt-6">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">{metric.label}</p>
        <p className="stat-kpi font-bold text-cobalt">{metric.value}</p>
      </div>
      <p className="text-xs leading-relaxed text-ink-secondary">{metric.detail}</p>
    </CardContent>
  </Card>
);
