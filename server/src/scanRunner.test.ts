import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from './types';
import { scanContainers } from './scanner';
import { getScanState, startScan } from './scanRunner';

vi.mock('./scanner', () => ({
  scanContainers: vi.fn(),
}));

const mockedScanContainers = vi.mocked(scanContainers);
const ctx = {} as AppContext;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('startScan', () => {
  it('skips a scan when another scan is already running', async () => {
    let finishScan!: () => void;
    const scanPromise = new Promise<void>((resolve) => {
      finishScan = resolve;
    });
    mockedScanContainers.mockReturnValueOnce(scanPromise);

    const first = startScan(ctx, 'scheduled');
    const second = startScan(ctx, 'manual');

    expect(first.started).toBe(true);
    expect(second.started).toBe(false);
    expect(mockedScanContainers).toHaveBeenCalledTimes(1);
    expect(getScanState().isScanning).toBe(true);

    finishScan();
    await vi.waitFor(() => {
      expect(getScanState().isScanning).toBe(false);
    });
  });

  it('allows a new scan after the active scan finishes', async () => {
    mockedScanContainers.mockResolvedValue(undefined);

    const first = startScan(ctx, 'scheduled');
    await vi.waitFor(() => {
      expect(getScanState().isScanning).toBe(false);
    });
    const second = startScan(ctx, 'manual');
    await vi.waitFor(() => {
      expect(getScanState().isScanning).toBe(false);
    });

    expect(first.started).toBe(true);
    expect(second.started).toBe(true);
    expect(mockedScanContainers).toHaveBeenCalledTimes(2);
    expect(getScanState().isScanning).toBe(false);
  });
});
