import { Button } from '@/components/ui/button';

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
          className="shrink-0"
        >
          <span>{opt.label}</span>
          {typeof opt.count === 'number' && (
            <span className="font-mono text-[11px] opacity-80">[{opt.count}]</span>
          )}
        </Button>
      );
    })}
  </div>
);
