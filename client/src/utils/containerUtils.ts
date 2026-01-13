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
}

export const COLUMNS: ContainerColumn[] = [
  { key: 'name', label: 'Name', widthClassName: 'w-48' },
  { key: 'image', label: 'Image', widthClassName: 'w-48' },
  { key: 'tag', label: 'Tag', widthClassName: 'w-32' },
  { key: 'registry', label: 'Registry', widthClassName: 'w-36' },
  { key: 'status', label: 'Status', widthClassName: 'w-42' },
  {
    key: 'createdAt',
    label: 'Image Created',
    widthClassName: 'w-48',
  },
  {
    key: 'lastSuccessAt',
    label: 'Last Success',
    widthClassName: 'w-48',
  },
  {
    key: 'lastUpdateDetectedAt',
    label: 'Last Update Detected',
    widthClassName: 'w-48',
  },
  {
    key: 'localDigest',
    label: 'Local Digest',
    widthClassName: 'w-32',
  },
  {
    key: 'latestDigest',
    label: 'Latest Digest',
    widthClassName: 'w-32',
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
