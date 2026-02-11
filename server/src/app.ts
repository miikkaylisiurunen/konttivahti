import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import type { AppContext } from './types';
import { ApiSettings, AuthCredentials, NotificationEventCatalog, NotificationTest } from './types';
import { Auth } from './auth';
import { ErrorResponse, HttpError, InvalidSessionError } from './error';
import { getStatusContainers } from './status';
import { getLogger } from './logger';
import { sendNotification } from './notify';

const logger = getLogger('API');

export function createApp(ctx: AppContext): express.Express {
  const auth = new Auth(ctx);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (!req.originalUrl.startsWith('/api')) return;
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

  app.get('/api/state', (req, res) => {
    res.json(auth.getState(req, res));
  });

  app.post('/api/setup', async (req, res) => {
    const parsed = AuthCredentials.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid request body');
    }

    await auth.setup(parsed.data, req, res);
  });

  app.post('/api/login', async (req, res) => {
    const parsed = AuthCredentials.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid request body');
    }

    await auth.login(parsed.data, req, res);
  });
  app.post('/api/logout', auth.logout);
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  const authRouter = express.Router();
  authRouter.use(auth.requireAuth);

  authRouter.get('/status', async (req, res) => {
    const results = await getStatusContainers(ctx);
    res.json({
      containers: results,
    });
  });

  authRouter.post('/notifications/test', async (req, res) => {
    const parsed = NotificationTest.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid request body');
    }

    const result = await sendNotification(ctx, {
      url: parsed.data.url,
      message: 'Konttivahti test notification',
      title: 'Konttivahti',
    });

    if (!result.attempted) {
      throw new HttpError(503, 'Notification service not configured');
    }

    if (!result.sent) {
      throw new HttpError(400, result.error ?? 'Test notification failed');
    }

    res.json(result);
  });

  authRouter.get('/settings', (req, res) => {
    const settings = ctx.db.getSettings();
    res.json({
      ...settings,
      notifications_available_events: NotificationEventCatalog,
    });
  });

  authRouter.post('/settings', (req, res) => {
    const parsed = ApiSettings.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid request body');
    }

    ctx.db.setNotificationSettings(parsed.data);

    res.json({ success: true });
  });

  app.use('/api', authRouter);

  const staticRoot = path.resolve(process.cwd(), 'public');
  const indexPath = path.join(staticRoot, 'index.html');
  app.use(express.static(staticRoot));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(indexPath);
  });

  app.use(() => {
    throw new HttpError(404, 'Not found');
  });

  app.use((err: unknown, req: Request, res: Response<ErrorResponse>, _next: NextFunction) => {
    const loggerPayload = { err, method: req.method, path: req.originalUrl };

    if (err instanceof HttpError) {
      if (err instanceof InvalidSessionError) {
        auth.clearSessionCookie(res);
      }
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
