import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterChipOption {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
}

interface FilterChipRailProps {
  readonly ariaLabel: string;
  readonly options: readonly FilterChipOption[];
  readonly selected: string;
  readonly onSelect: (value: string) => void;
}

export const FilterChipRail = ({
  ariaLabel,
  options,
  selected,
  onSelect,
}: FilterChipRailProps) => (
  <div className="relative w-full">
    <div role="group" aria-label={ariaLabel} className="chip-rail">
      {options.map((opt) => {
        const isActive = selected === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            aria-pressed={isActive}
            variant={isActive ? 'default' : 'outline'}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'shrink-0 rounded-full px-3.5',
              isActive ? 'shadow-sm' : 'bg-surface-lowest'
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 font-mono text-[11px]',
                  isActive
                    ? 'bg-primary-dim text-on-primary'
                    : 'bg-surface-low text-on-surface-variant'
                )}
              >
                {opt.count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-surface to-transparent sm:hidden"
    />
  </div>
);
