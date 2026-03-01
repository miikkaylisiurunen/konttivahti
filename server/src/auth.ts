import { Request, Response, NextFunction } from 'express';
import type { AppContext } from './types';
import { HttpError, InvalidSessionError } from './error';
import { getLogger } from './logger';
import { notifyEvent } from './notify';
import { verifyPasswordHash } from './passwordHash';

const logger = getLogger('Auth');

const FAILED_LOGIN_NOTIFY_THRESHOLD = 10;
const FAILED_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const FAILED_LOGIN_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000;

export const SESSION_COOKIE_NAME = 'konttivahti_session';
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false,
  path: '/',
};

export class Auth {
  private failedLoginAttempts = 0;
  private failedLoginWindowStartMs: number | null = null;
  private failedLoginLastNotifiedAtMs: number | null = null;

  constructor(private readonly ctx: AppContext) {}

  private verifyAdminCredentials = async (username: string, password: string): Promise<boolean> => {
    const authConfig = this.ctx.db.getAuthConfig();

    if (!authConfig) {
      return false;
    }

    const passwordMatches = await verifyPasswordHash(authConfig.password_hash, password);
    return passwordMatches && username === authConfig.username;
  };

  private getSessionToken = (req: Request): string | null => {
    return req.cookies?.[SESSION_COOKIE_NAME] ?? null;
  };

  private recordFailedLoginAttempt = (): void => {
    const nowMs = Date.now();
    if (
      this.failedLoginWindowStartMs === null ||
      nowMs - this.failedLoginWindowStartMs > FAILED_LOGIN_WINDOW_MS
    ) {
      this.failedLoginWindowStartMs = nowMs;
      this.failedLoginAttempts = 1;
    } else {
      this.failedLoginAttempts++;
    }

    if (this.failedLoginAttempts < FAILED_LOGIN_NOTIFY_THRESHOLD) {
      return;
    }

    const inCooldown =
      this.failedLoginLastNotifiedAtMs !== null &&
      nowMs - this.failedLoginLastNotifiedAtMs < FAILED_LOGIN_NOTIFY_COOLDOWN_MS;

    if (!inCooldown) {
      this.failedLoginLastNotifiedAtMs = nowMs;
      void notifyEvent(this.ctx, 'suspicious-login', 'Detected repeated failed login attempts.');
    }
  };

  requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (!this.ctx.db.isAuthInitialized()) {
      throw new HttpError(503, 'Application is not initialized');
    }

    const token = this.getSessionToken(req);

    if (!token) {
      throw new HttpError(401, 'Authentication required');
    }

    const result = this.ctx.db.validateSession(token, this.ctx.env.SESSION_TIMEOUT_MS);

    if (!result) {
      throw new InvalidSessionError();
    }

    if (result.touched) {
      const maxAge = result.session.expiresAt - Date.now();
      res.cookie(SESSION_COOKIE_NAME, token, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge,
      });
    }

    next();
  };

  getState = (
    req: Request,
    res: Response,
  ): { isInitialized: boolean; isAuthenticated: boolean } => {
    const isInitialized = this.ctx.db.isAuthInitialized();

    if (!isInitialized) {
      return { isInitialized, isAuthenticated: false };
    }

    const token = this.getSessionToken(req);

    if (!token) {
      return { isInitialized, isAuthenticated: false };
    }

    const result = this.ctx.db.validateSession(token, this.ctx.env.SESSION_TIMEOUT_MS);

    if (!result) {
      this.clearSessionCookie(res);
      return { isInitialized, isAuthenticated: false };
    }

    if (result.touched) {
      const maxAge = result.session.expiresAt - Date.now();
      res.cookie(SESSION_COOKIE_NAME, token, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge,
      });
    }

    return { isInitialized, isAuthenticated: true };
  };

  setup = async (
    credentials: { username: string; password: string },
    req: Request,
    res: Response,
  ): Promise<void> => {
    if (this.ctx.db.isAuthInitialized()) {
      throw new HttpError(409, 'Application is already initialized');
    }

    const initialized = await this.ctx.db.initializeAuth(
      credentials.username,
      credentials.password,
    );

    if (!initialized) {
      throw new HttpError(409, 'Application is already initialized');
    }

    const token = this.ctx.db.createSession(this.ctx.env.SESSION_TIMEOUT_MS);
    res.cookie(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: this.ctx.env.SESSION_TIMEOUT_MS,
    });

    logger.info({ ip: req.ip, username: credentials.username }, 'Initial account configured');
    res.json({});
  };

  login = async (
    credentials: { username: string; password: string },
    req: Request,
    res: Response,
  ): Promise<void> => {
    if (!this.ctx.db.isAuthInitialized()) {
      throw new HttpError(409, 'Application is not initialized');
    }

    if (!(await this.verifyAdminCredentials(credentials.username, credentials.password))) {
      logger.warn({ ip: req.ip, username: credentials.username }, 'Login failed');
      this.recordFailedLoginAttempt();
      throw new HttpError(401, 'Invalid credentials');
    }

    const token = this.ctx.db.createSession(this.ctx.env.SESSION_TIMEOUT_MS);
    this.failedLoginAttempts = 0;
    this.failedLoginWindowStartMs = null;

    res.cookie(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: this.ctx.env.SESSION_TIMEOUT_MS,
    });

    logger.info({ ip: req.ip, username: credentials.username }, 'Login successful');
    res.json({});
  };

  logout = (req: Request, res: Response): void => {
    const token = this.getSessionToken(req);

    if (token) {
      this.ctx.db.deleteSession(token);
    }

    this.clearSessionCookie(res);
    logger.info({ ip: req.ip, hadSession: Boolean(token) }, 'Logout');
    res.json({ message: 'Logged out successfully' });
  };

  clearSessionCookie = (res: Response): void => {
    res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
  };
}
