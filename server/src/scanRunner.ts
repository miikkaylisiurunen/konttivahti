import type { AppContext } from './types';
import { getLogger } from './logger';
import { scanContainers } from './scanner';

const logger = getLogger('ScanRunner');

export interface ScanState {
  isScanning: boolean;
  startedAt: number | null;
  lastFinishedAt: number | null;
}

export interface ScanStartResult {
  started: boolean;
  scan: ScanState;
}

let activeScan: Promise<void> | null = null;
let startedAt: number | null = null;
let lastFinishedAt: number | null = null;

export function getScanState(): ScanState {
  return {
    isScanning: activeScan !== null,
    startedAt,
    lastFinishedAt,
  };
}

export function startScan(ctx: AppContext): ScanStartResult {
  if (activeScan) {
    logger.info({ startedAt }, 'Skipping scan because another scan is running');
    return {
      started: false,
      scan: getScanState(),
    };
  }

  startedAt = Date.now();

  activeScan = scanContainers(ctx)
    .catch((err) => {
      logger.error({ err }, 'Scan failed');
    })
    .finally(() => {
      activeScan = null;
      lastFinishedAt = Date.now();
    });

  return {
    started: true,
    scan: getScanState(),
  };
}
