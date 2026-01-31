import cron, { type ScheduledTask } from 'node-cron';
import type { AppContext } from './types';
import { scanContainers } from './scanner';
import { getLogger } from './logger';

const logger = getLogger('Jobs');

export interface Jobs {
  stop: () => void;
}

export function startJobs(ctx: AppContext): Jobs {
  const tasks: ScheduledTask[] = [];

  tasks.push(
    cron.schedule(ctx.env.SCAN_SCHEDULE, () => {
      logger.info({ schedule: ctx.env.SCAN_SCHEDULE }, 'Scheduled scan started');
      scanContainers(ctx).catch((err) => {
        logger.error({ err }, 'Scheduled scan failed');
      });
    }),
  );

  tasks.push(
    cron.schedule(ctx.env.SESSION_CLEANUP_SCHEDULE, () => {
      try {
        const deletedCount = ctx.db.cleanupExpiredSessions();

        if (deletedCount > 0) {
          logger.info({ deletedCount }, 'Expired sessions cleaned');
        }
      } catch (err) {
        logger.error({ err }, 'Expired session cleanup failed');
      }
    }),
  );

  return {
    stop: () => {
      for (const task of tasks) {
        task.stop();
      }
    },
  };
}
