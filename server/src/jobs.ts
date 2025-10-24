import cron, { type ScheduledTask } from 'node-cron';
import type { AppContext } from './types';
import { scanContainers } from './scanner';

export interface Jobs {
  stop: () => void;
}

export function startJobs(ctx: AppContext): Jobs {
  const tasks: ScheduledTask[] = [];

  tasks.push(
    cron.schedule(ctx.env.SCAN_SCHEDULE, () => {
      console.log('Scheduled scan started');
      scanContainers(ctx).catch((err) => {
        console.error('Scheduled scan failed:', err);
      });
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
