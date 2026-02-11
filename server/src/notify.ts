import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AppContext, NotificationEventKey } from './types';
import { NotificationEventCatalog } from './types';
import { getLogger } from './logger';

const logger = getLogger('Notify');

const execFileAsync = promisify(execFile);

export interface NotificationResult {
  attempted: boolean;
  sent: boolean;
  error?: string;
}

export interface NotificationPayload {
  url: string;
  message: string;
  title: string;
}

function getEventLabel(event: NotificationEventKey): string {
  return NotificationEventCatalog.find((entry) => entry.id === event)?.label ?? event;
}

export async function notifyEvent(
  ctx: AppContext,
  event: NotificationEventKey,
  message: string,
): Promise<NotificationResult> {
  try {
    const settings = ctx.db.getSettings();
    if (
      !settings.notifications_enabled ||
      settings.notifications_recipients.length === 0 ||
      !settings.notifications_events.includes(event)
    ) {
      logger.info({ event, message }, 'Notification skipped');
      return { attempted: false, sent: false };
    }

    const now = Date.now();
    const title = `Konttivahti: ${getEventLabel(event)}`;
    const results = await Promise.all(
      settings.notifications_recipients.map((recipient) =>
        sendNotification(ctx, {
          url: recipient,
          message,
          title,
        }),
      ),
    );

    const attemptedCount = results.filter((result) => result.attempted).length;
    const sentCount = results.filter((result) => result.sent).length;
    const failedCount = attemptedCount - sentCount;
    const payload = {
      event,
      message,
      recipients: settings.notifications_recipients.length,
      sent: sentCount,
      failed: failedCount,
      durationMs: Date.now() - now,
    };

    if (attemptedCount === 0) {
      logger.info(payload, 'Notification not attempted');
    } else if (sentCount > 0) {
      logger.info(payload, 'Notification delivered');
    } else {
      logger.warn(payload, 'Notification delivery failed');
    }

    return { attempted: attemptedCount > 0, sent: sentCount > 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn({ event, error: message }, 'Notification delivery failed');
    return { attempted: false, sent: false, error: message };
  }
}

export async function sendNotification(
  ctx: AppContext,
  payload: NotificationPayload,
): Promise<NotificationResult> {
  const { url, message, title } = payload;
  const binary = ctx.env.SHOUTRRR_BINARY;
  if (!binary) {
    return { attempted: false, sent: false };
  }

  const args = ['send', '--url', url, '--message', message, '--title', title];

  try {
    await execFileAsync(binary, args, {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });
    return { attempted: true, sent: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if ('code' in err && err.code === 'ENOENT') {
      logger.warn({ binary }, 'Shoutrrr binary not found');
      return { attempted: false, sent: false, error: 'Shoutrrr binary not found' };
    }

    const message = err.message;
    logger.warn({ error: message }, 'Notification send failed');
    return { attempted: true, sent: false, error: message };
  }
}
