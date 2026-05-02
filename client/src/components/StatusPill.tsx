import { Popover } from '@base-ui/react/popover';
import type { ContainerStatus } from '../types';
import { STATUS_LABELS, type StatusVariant } from '../utils/containerUtils';
interface StatusPillProps {
  status: ContainerStatus;
  error: string | null;
}

interface StatusConfig {
  pillClass: string;
  dotClass: string;
  description: string;
}

const STATUS_CONFIGS: Record<StatusVariant, StatusConfig> = {
  error: {
    pillClass:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400',
    dotClass: 'bg-red-500 dark:bg-red-400',
    description: 'An error occurred during status check',
  },
  up_to_date: {
    pillClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400',
    description: 'You are using the latest version of this image',
  },
  outdated: {
    pillClass:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
    description: 'This image has a newer version available',
  },
  local: {
    pillClass:
      'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
    dotClass: 'bg-sky-500 dark:bg-sky-300',
    description: 'Image is local-only or missing a registry digest',
  },
  unknown: {
    pillClass:
      'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-500/30 dark:bg-zinc-500/10 dark:text-zinc-300',
    dotClass: 'bg-zinc-500 dark:bg-zinc-400',
    description: 'Status has not been checked yet',
  },
};

interface StatusPopoverProps {
  variant: StatusVariant;
  descriptionOverride?: string;
}

const StatusPopover = ({ variant, descriptionOverride }: StatusPopoverProps) => {
  const { pillClass, dotClass, description } = STATUS_CONFIGS[variant];
  const label = STATUS_LABELS[variant];

  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex cursor-pointer items-center rounded-full bg-transparent p-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-foreground">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase ${pillClass}`}
        >
          <span className={`h-2 w-2 shrink-0 mr-3 rounded-full ${dotClass}`}></span>
          {label}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className="max-w-xs rounded-lg border border-outline bg-surface-1 p-4 shadow-popover transition data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
            <Popover.Title className="mb-1 text-sm font-semibold text-foreground-strong">
              {label}
            </Popover.Title>
            <Popover.Description className="text-sm text-foreground-muted">
              {descriptionOverride ?? description}
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};

export function StatusPill({ status, error }: StatusPillProps) {
  const variant: StatusVariant = error ? 'error' : (status ?? 'unknown');

  return <StatusPopover variant={variant} descriptionOverride={error ?? undefined} />;
}
