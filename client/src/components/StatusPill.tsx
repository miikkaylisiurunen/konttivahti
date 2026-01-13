import type { ContainerStatus } from '../types';
import { STATUS_LABELS, type StatusVariant } from '../utils/containerUtils';

interface StatusPillProps {
  status: ContainerStatus;
  error: string | null;
}

interface StatusConfig {
  pillClass: string;
  dotClass: string;
}

const STATUS_CONFIGS: Record<StatusVariant, StatusConfig> = {
  error: {
    pillClass: 'border-red-500/20 bg-red-500/10 text-red-400',
    dotClass: 'bg-red-400',
  },
  up_to_date: {
    pillClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    dotClass: 'bg-emerald-400',
  },
  outdated: {
    pillClass: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    dotClass: 'bg-amber-400',
  },
  local: {
    pillClass: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    dotClass: 'bg-sky-300',
  },
  unknown: {
    pillClass: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300',
    dotClass: 'bg-zinc-400',
  },
};

export function StatusPill({ status, error }: StatusPillProps) {
  const variant: StatusVariant = error ? 'error' : (status ?? 'unknown');
  const { pillClass, dotClass } = STATUS_CONFIGS[variant];
  const label = STATUS_LABELS[variant];

  return (
    <div className="inline-flex items-center rounded-full p-0">
      <span
        className={`inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase ${pillClass}`}
      >
        <span className={`h-2 w-2 shrink-0 mr-3 rounded-full ${dotClass}`}></span>
        {label}
      </span>
    </div>
  );
}
