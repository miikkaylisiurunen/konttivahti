import {
  Activity,
  Calendar,
  CheckCircle2,
  Fingerprint,
  Globe,
  Package,
  RefreshCw,
  Tag,
  Type,
  type LucideIcon,
} from 'lucide-react';
import type { Container, ContainerStatus } from '../types';

export type ColumnKey = keyof Pick<
  Container,
  | 'name'
  | 'image'
  | 'tag'
  | 'registry'
  | 'status'
  | 'createdAt'
  | 'lastSuccessAt'
  | 'lastUpdateDetectedAt'
  | 'localDigest'
  | 'latestDigest'
>;

export type ColumnKind = 'text' | 'status' | 'date' | 'digest';
export type StatusVariant = Exclude<ContainerStatus, null> | 'unknown';

export const STATUS_LABELS: Record<StatusVariant, string> = {
  up_to_date: 'Up to date',
  outdated: 'Outdated',
  local: 'Local',
  error: 'Error',
  unknown: 'Unknown',
};

export interface ContainerColumn {
  key: ColumnKey;
  label: string;
  widthClassName: string;
  kind: ColumnKind;
  Icon: LucideIcon;
}

export const COLUMNS: ContainerColumn[] = [
  { key: 'name', label: 'Name', widthClassName: 'w-48', kind: 'text', Icon: Type },
  { key: 'image', label: 'Image', widthClassName: 'w-48', kind: 'text', Icon: Package },
  { key: 'tag', label: 'Tag', widthClassName: 'w-32', kind: 'text', Icon: Tag },
  { key: 'registry', label: 'Registry', widthClassName: 'w-36', kind: 'text', Icon: Globe },
  { key: 'status', label: 'Status', widthClassName: 'w-42', kind: 'status', Icon: Activity },
  {
    key: 'createdAt',
    label: 'Image Created',
    widthClassName: 'w-48',
    kind: 'date',
    Icon: Calendar,
  },
  {
    key: 'lastSuccessAt',
    label: 'Last Success',
    widthClassName: 'w-48',
    kind: 'date',
    Icon: CheckCircle2,
  },
  {
    key: 'lastUpdateDetectedAt',
    label: 'Last Update Detected',
    widthClassName: 'w-48',
    kind: 'date',
    Icon: RefreshCw,
  },
  {
    key: 'localDigest',
    label: 'Local Digest',
    widthClassName: 'w-32',
    kind: 'digest',
    Icon: Fingerprint,
  },
  {
    key: 'latestDigest',
    label: 'Latest Digest',
    widthClassName: 'w-32',
    kind: 'digest',
    Icon: Fingerprint,
  },
];

export function getRegistryLabel(container: Container): string {
  return container.status === 'local' ? 'local' : container.registry;
}

export function getTagLabel(container: Container): string {
  if (container.requestedDigest) {
    if (container.tag === 'latest') {
      return `@${container.requestedDigest}`;
    }

    return `${container.tag}@${container.requestedDigest}`;
  }

  return container.tag;
}
