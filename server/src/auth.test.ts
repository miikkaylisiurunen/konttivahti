import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { Auth, SESSION_COOKIE_NAME } from './auth';
import { DB, getSessionTouchIntervalMs } from './db';
import type { AppContext } from './types';

function createFixture() {
  const db = new DB(':memory:');
  db.runMigrations();

  const ctx = {
    env: { SESSION_TIMEOUT_MS: 60000 },
    db,
    docker: {},
  } as unknown as AppContext;

  return {
    db,
    auth: new Auth(ctx),
  };
}

function createRequest(cookies: Record<string, string> = {}): Request {
  return {
    cookies,
    ip: '127.0.0.1',
  } as unknown as Request;
}

function createResponse() {
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  const json = vi.fn();

  return {
    res: {
      cookie,
      clearCookie,
      json,
    } as unknown as Response,
    cookie,
    clearCookie,
    json,
  };
}

describe('Auth', () => {
  let fixture!: ReturnType<typeof createFixture>;

  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(() => {
    fixture.db.close();
    vi.restoreAllMocks();
  });

  it('returns unauthenticated state before setup', () => {
    const { res } = createResponse();

    const state = fixture.auth.getState(createRequest(), res);

    expect(state).toEqual({
      isInitialized: false,
      isAuthenticated: false,
    });
  });

  it('rejects login before setup', async () => {
    const { res } = createResponse();

    await expect(
      fixture.auth.login({ username: 'admin', password: 'password' }, createRequest(), res),
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('requireAuth throws before setup', () => {
    const { res } = createResponse();
    const next = vi.fn();

    expect(() => fixture.auth.requireAuth(createRequest(), res, next)).toThrowError(
      expect.objectContaining({
        statusCode: 503,
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('setup initializes auth and authenticates session state', async () => {
    const setupReq = createRequest();
    const setupResponse = createResponse();

    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      setupReq,
      setupResponse.res,
    );

    const token = setupResponse.cookie.mock.calls[0]?.[1] as string | undefined;
    expect(token).toBeTruthy();
    expect(setupResponse.cookie).toHaveBeenCalledTimes(1);
    expect(setupResponse.cookie.mock.calls[0]?.[0]).toBe(SESSION_COOKIE_NAME);

    const stateResponse = createResponse();
    const state = fixture.auth.getState(
      createRequest({ [SESSION_COOKIE_NAME]: token ?? '' }),
      stateResponse.res,
    );

    expect(state).toEqual({
      isInitialized: true,
      isAuthenticated: true,
    });
  });

  it('rejects setup when already initialized', async () => {
    const firstSetupResponse = createResponse();
    const initializeAuthSpy = vi.spyOn(fixture.db, 'initializeAuth');

    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      firstSetupResponse.res,
    );
    expect(initializeAuthSpy).toHaveBeenCalledTimes(1);
    const authConfigBeforeSecondSetup = fixture.db.getAuthConfig();
    expect(authConfigBeforeSecondSetup).not.toBeNull();

    const secondSetupResponse = createResponse();

    await expect(
      fixture.auth.setup(
        { username: 'admin2', password: 'password2' },
        createRequest(),
        secondSetupResponse.res,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(fixture.db.getAuthConfig()).toEqual(authConfigBeforeSecondSetup);
    expect(initializeAuthSpy).toHaveBeenCalledTimes(1);
    expect(secondSetupResponse.cookie).not.toHaveBeenCalled();

    const originalLoginResponse = createResponse();
    await expect(
      fixture.auth.login(
        { username: 'admin', password: 'password' },
        createRequest(),
        originalLoginResponse.res,
      ),
    ).resolves.toBeUndefined();

    const replacementLoginResponse = createResponse();
    await expect(
      fixture.auth.login(
        { username: 'admin2', password: 'password2' },
        createRequest(),
        replacementLoginResponse.res,
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('rejects login with invalid credentials after setup', async () => {
    const setupResponse = createResponse();
    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      setupResponse.res,
    );

    const loginResponse = createResponse();
    const rawDb = fixture.db as unknown as { db: Database.Database };
    const sessionsBefore = rawDb.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as {
      count: number;
    };

    await expect(
      fixture.auth.login(
        { username: 'admin', password: 'wrong-password' },
        createRequest(),
        loginResponse.res,
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
    });

    expect(loginResponse.cookie).not.toHaveBeenCalled();
    const sessionsAfter = rawDb.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as {
      count: number;
    };
    expect(sessionsAfter.count).toBe(sessionsBefore.count);
  });

  it('allows login with valid credentials after setup', async () => {
    const setupResponse = createResponse();
    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      setupResponse.res,
    );

    const loginResponse = createResponse();

    await expect(
      fixture.auth.login(
        { username: 'admin', password: 'password' },
        createRequest(),
        loginResponse.res,
      ),
    ).resolves.toBeUndefined();

    const token = loginResponse.cookie.mock.calls[0]?.[1] as string | undefined;
    expect(token).toBeTruthy();
    expect(fixture.db.validateSession(token ?? '', 60000)).not.toBeNull();
  });

  it('requireAuth rejects invalid session cookies', async () => {
    const setupResponse = createResponse();
    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      setupResponse.res,
    );

    const next = vi.fn();
    const { res, clearCookie } = createResponse();

    expect(() =>
      fixture.auth.requireAuth(
        createRequest({ [SESSION_COOKIE_NAME]: 'invalid-token' }),
        res,
        next,
      ),
    ).toThrowError(
      expect.objectContaining({
        statusCode: 401,
        name: 'InvalidSessionError',
      }),
    );

    expect(next).not.toHaveBeenCalled();
    expect(clearCookie).not.toHaveBeenCalled();
  });

  it('getState clears invalid session cookies', async () => {
    const setupResponse = createResponse();
    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      setupResponse.res,
    );

    const { res, clearCookie } = createResponse();
    const state = fixture.auth.getState(
      createRequest({ [SESSION_COOKIE_NAME]: 'invalid-token' }),
      res,
    );

    expect(state).toEqual({
      isInitialized: true,
      isAuthenticated: false,
    });
    expect(clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, expect.any(Object));
  });

  it('requireAuth refreshes touched sessions', async () => {
    const setupResponse = createResponse();
    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      setupResponse.res,
    );

    const token = setupResponse.cookie.mock.calls[0]?.[1] as string | undefined;
    expect(token).toBeTruthy();

    const rawDb = fixture.db as unknown as { db: Database.Database };
    const touchIntervalMs = getSessionTouchIntervalMs(60000);
    const agedLastAccessed = Date.now() - touchIntervalMs - 1;
    rawDb.db
      .prepare('UPDATE sessions SET lastAccessed = ?, expiresAt = ?')
      .run(agedLastAccessed, Date.now() + 60000);

    const next = vi.fn();
    const { res, cookie } = createResponse();
    fixture.auth.requireAuth(createRequest({ [SESSION_COOKIE_NAME]: token ?? '' }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(cookie).toHaveBeenCalledTimes(1);
    expect(cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      token,
      expect.objectContaining({
        maxAge: expect.any(Number),
      }),
    );
  });

  it('getState refreshes touched sessions', async () => {
    const setupResponse = createResponse();
    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      setupResponse.res,
    );

    const token = setupResponse.cookie.mock.calls[0]?.[1] as string | undefined;
    expect(token).toBeTruthy();

    const rawDb = fixture.db as unknown as { db: Database.Database };
    const touchIntervalMs = getSessionTouchIntervalMs(60000);
    const agedLastAccessed = Date.now() - touchIntervalMs - 1;
    rawDb.db
      .prepare('UPDATE sessions SET lastAccessed = ?, expiresAt = ?')
      .run(agedLastAccessed, Date.now() + 60000);

    const { res, cookie } = createResponse();
    const state = fixture.auth.getState(createRequest({ [SESSION_COOKIE_NAME]: token ?? '' }), res);

    expect(state).toEqual({
      isInitialized: true,
      isAuthenticated: true,
    });
    expect(cookie).toHaveBeenCalledTimes(1);
    expect(cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      token,
      expect.objectContaining({
        maxAge: expect.any(Number),
      }),
    );
  });

  it('does not refresh fresh sessions in requireAuth or getState', async () => {
    const setupResponse = createResponse();
    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      setupResponse.res,
    );

    const token = setupResponse.cookie.mock.calls[0]?.[1] as string | undefined;
    expect(token).toBeTruthy();

    const requireAuthResponse = createResponse();
    const next = vi.fn();
    fixture.auth.requireAuth(
      createRequest({ [SESSION_COOKIE_NAME]: token ?? '' }),
      requireAuthResponse.res,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(requireAuthResponse.cookie).not.toHaveBeenCalled();

    const stateResponse = createResponse();
    const state = fixture.auth.getState(
      createRequest({ [SESSION_COOKIE_NAME]: token ?? '' }),
      stateResponse.res,
    );

    expect(state).toEqual({
      isInitialized: true,
      isAuthenticated: true,
    });
    expect(stateResponse.cookie).not.toHaveBeenCalled();
  });

  it('logout removes the session from db', async () => {
    const setupResponse = createResponse();
    await fixture.auth.setup(
      { username: 'admin', password: 'password' },
      createRequest(),
      setupResponse.res,
    );

    const token = setupResponse.cookie.mock.calls[0]?.[1] as string | undefined;
    expect(token).toBeTruthy();
    expect(fixture.db.validateSession(token ?? '', 60000)).not.toBeNull();

    const logoutResponse = createResponse();
    fixture.auth.logout(createRequest({ [SESSION_COOKIE_NAME]: token ?? '' }), logoutResponse.res);

    expect(fixture.db.validateSession(token ?? '', 60000)).toBeNull();
    expect(logoutResponse.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.any(Object),
    );
  });
});
