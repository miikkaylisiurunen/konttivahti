import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import type { AppContext } from './types';

vi.mock('node:child_process', () => ({
  execFile: vi.fn((file, args, options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    if (cb) cb(null, '', '');
    return {} as unknown;
  }),
}));

import { sendNotification } from './notify';
import { notifyEvent } from './notify';

const baseCtx = {
  env: {
    SHOUTRRR_BINARY: 'shoutrrr',
  },
  db: {} as AppContext['db'],
  docker: {} as AppContext['docker'],
} as AppContext;

function createCtxWithSettings(getSettings: AppContext['db']['getSettings']): AppContext {
  return {
    ...baseCtx,
    db: {
      ...baseCtx.db,
      getSettings,
    } as AppContext['db'],
  };
}

function mockExecFileSuccess() {
  const mockedExecFile = execFile as unknown as ReturnType<typeof vi.fn>;
  mockedExecFile.mockReset();
  mockedExecFile.mockImplementation((file, args, options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    if (cb) cb(null, '', '');
    return {} as unknown;
  });
  return mockedExecFile;
}

describe('sendNotification', () => {
  beforeEach(() => {
    mockExecFileSuccess();
  });

  it('returns a no-op result when binary is missing', async () => {
    const ctx = {
      ...baseCtx,
      env: {
        ...baseCtx.env,
        SHOUTRRR_BINARY: undefined,
      },
    };

    const result = await sendNotification(ctx, {
      url: 'ntfy://example.com/mytopic',
      message: 'hello',
      title: 'title',
    });

    expect(result).toEqual({ attempted: false, sent: false });
    expect(execFile).not.toHaveBeenCalled();
  });

  it('invokes shoutrrr when URL is set', async () => {
    const result = await sendNotification(baseCtx, {
      url: 'ntfy://example.com/mytopic',
      message: 'hello',
      title: 'title',
    });

    expect(result).toEqual({ attempted: true, sent: true });
    expect(execFile).toHaveBeenCalledWith(
      'shoutrrr',
      ['send', '--url', 'ntfy://example.com/mytopic', '--message', 'hello', '--title', 'title'],
      {
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      },
      expect.any(Function),
    );
  });

  it('returns a safe error when binary is missing', async () => {
    const mockedExecFile = execFile as unknown as ReturnType<typeof vi.fn>;
    mockedExecFile.mockImplementationOnce((file, args, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      const err = new Error('not found') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      if (cb) cb(err, '', '');
      return {} as unknown;
    });

    const result = await sendNotification(baseCtx, {
      url: 'ntfy://example.com/mytopic',
      message: 'hello',
      title: 'title',
    });
    expect(result).toEqual({
      attempted: false,
      sent: false,
      error: 'Shoutrrr binary not found',
    });
  });

  it('returns an error when shoutrrr fails to send', async () => {
    const mockedExecFile = execFile as unknown as ReturnType<typeof vi.fn>;
    mockedExecFile.mockImplementationOnce((file, args, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      const err = new Error('invalid url');
      if (cb) cb(err, '', '');
      return {} as unknown;
    });

    const result = await sendNotification(baseCtx, {
      url: 'ntfy://invalid',
      message: 'hello',
      title: 'title',
    });

    expect(result).toEqual({
      attempted: true,
      sent: false,
      error: 'invalid url',
    });
  });
});

describe('notifyEvent', () => {
  beforeEach(() => {
    mockExecFileSuccess();
  });

  it('skips when notifications are disabled', async () => {
    const ctx = createCtxWithSettings(() => ({
      notifications_enabled: false,
      notifications_recipients: ['ntfy://example.com/mytopic'],
      notifications_events: ['update-available'],
    }));

    await notifyEvent(ctx, 'update-available', 'hello');
    expect(execFile).not.toHaveBeenCalled();
  });

  it('skips when event is not enabled', async () => {
    const ctx = createCtxWithSettings(() => ({
      notifications_enabled: true,
      notifications_recipients: ['ntfy://example.com/mytopic'],
      notifications_events: ['scan-error'],
    }));

    await notifyEvent(ctx, 'update-available', 'hello');
    expect(execFile).not.toHaveBeenCalled();
  });

  it('skips when no recipients are configured', async () => {
    const ctx = createCtxWithSettings(() => ({
      notifications_enabled: true,
      notifications_recipients: [],
      notifications_events: ['update-available'],
    }));

    const result = await notifyEvent(ctx, 'update-available', 'hello');

    expect(result).toEqual({ attempted: false, sent: false });
    expect(execFile).not.toHaveBeenCalled();
  });

  it('sends to all recipients for enabled events', async () => {
    const ctx = createCtxWithSettings(() => ({
      notifications_enabled: true,
      notifications_recipients: ['ntfy://example.com/mytopic', 'discord://token@webhook'],
      notifications_events: ['update-available'],
    }));

    const result = await notifyEvent(ctx, 'update-available', 'hello');

    expect(result).toEqual({ attempted: true, sent: true });
    expect(execFile).toHaveBeenCalledTimes(2);
    expect(execFile).toHaveBeenNthCalledWith(
      1,
      'shoutrrr',
      [
        'send',
        '--url',
        'ntfy://example.com/mytopic',
        '--message',
        'hello',
        '--title',
        'Konttivahti: New version detected',
      ],
      {
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      },
      expect.any(Function),
    );
  });

  it('returns failure when all notifications fail', async () => {
    const mockedExecFile = execFile as unknown as ReturnType<typeof vi.fn>;
    mockedExecFile.mockImplementation((file, args, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (cb) cb(new Error('send failed'), '', '');
      return {} as unknown;
    });

    const ctx = createCtxWithSettings(() => ({
      notifications_enabled: true,
      notifications_recipients: ['ntfy://example.com/mytopic', 'discord://token@webhook'],
      notifications_events: ['update-available'],
    }));

    const result = await notifyEvent(ctx, 'update-available', 'hello');

    expect(result).toEqual({ attempted: true, sent: false });
    expect(execFile).toHaveBeenCalledTimes(2);
  });

  it('returns success when at least one notification is delivered', async () => {
    const mockedExecFile = execFile as unknown as ReturnType<typeof vi.fn>;
    mockedExecFile
      .mockImplementationOnce((file, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        if (cb) cb(new Error('send failed'), '', '');
        return {} as unknown;
      })
      .mockImplementationOnce((file, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        if (cb) cb(null, '', '');
        return {} as unknown;
      });

    const ctx = createCtxWithSettings(() => ({
      notifications_enabled: true,
      notifications_recipients: ['ntfy://example.com/mytopic', 'discord://token@webhook'],
      notifications_events: ['update-available'],
    }));

    const result = await notifyEvent(ctx, 'update-available', 'hello');

    expect(result).toEqual({ attempted: true, sent: true });
    expect(execFile).toHaveBeenCalledTimes(2);
  });

  it('returns an error when loading settings fails', async () => {
    const ctx = createCtxWithSettings(() => {
      throw new Error('db offline');
    });

    const result = await notifyEvent(ctx, 'update-available', 'hello');

    expect(result).toEqual({
      attempted: false,
      sent: false,
      error: 'db offline',
    });
    expect(execFile).not.toHaveBeenCalled();
  });
});
