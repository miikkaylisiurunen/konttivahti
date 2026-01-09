import pino, { type Logger } from 'pino';

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info');

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: process.stdout.isTTY,
    singleLine: true,
    errorLikeObjectKeys: [],
    translateTime: `UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'`,
    messageFormat: '[{module}] {msg}',
    ignore: 'pid,hostname,module',
  },
});

const baseLogger = pino({ level, base: null }, transport);

export function getLogger(module: string): Logger {
  return baseLogger.child({ module });
}
