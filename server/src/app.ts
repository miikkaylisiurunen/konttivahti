import express, { Request, Response, NextFunction } from 'express';
import type { AppContext } from './types';
import { ErrorResponse, HttpError } from './error';
import { getStatusContainers } from './status';
import { getLogger } from './logger';

const logger = getLogger('API');

export function createApp(ctx: AppContext): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info(
        {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Date.now() - start,
        },
        'Request completed',
      );
    });
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/status', async (req, res) => {
    const results = await getStatusContainers(ctx);
    res.json({
      containers: results,
    });
  });

  app.use(() => {
    throw new HttpError(404, 'Not found');
  });

  app.use((err: unknown, req: Request, res: Response<ErrorResponse>, _next: NextFunction) => {
    const loggerPayload = { err, method: req.method, path: req.originalUrl };

    if (err instanceof HttpError) {
      logger.warn(loggerPayload, 'HttpError occurred');
      res.status(err.statusCode).json({
        error: err.message,
        name: 'HttpError',
        ...(err.details ? { details: err.details } : {}),
      });
      return;
    }

    logger.error(loggerPayload, 'Unhandled request error');
    res.status(500).json({ error: 'Internal server error', name: 'InternalServerError' });
  });

  return app;
}
