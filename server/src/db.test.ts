import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { DB, getSessionTouchIntervalMs } from './db';
import { verifyPasswordHash } from './passwordHash';
import type { DbContainer } from './types';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function getRawDb(db: DB): Database.Database {
  return (db as unknown as { db: Database.Database }).db;
}

describe('DB sessions', () => {
  let db!: DB;

  beforeEach(() => {
    db = new DB(':memory:');
    db.runMigrations();
  });

  afterEach(() => {
    db.close();
  });

  it('stores hashed tokens and validates by hash', () => {
    const token = db.createSession(60000);
    const row = getRawDb(db).prepare('SELECT token_hash FROM sessions LIMIT 1').get() as {
      token_hash: string;
    };

    expect(row.token_hash).toBe(sha256(token));
    expect(row.token_hash).not.toBe(token);
    const result = db.validateSession(token, 60000);
    expect(result).not.toBeNull();
    expect(result?.session).not.toBeNull();
  });

  it('creates unique hex session tokens', () => {
    const firstToken = db.createSession(60000);
    const secondToken = db.createSession(60000);

    expect(firstToken).toMatch(/^[0-9a-f]{64}$/);
    expect(secondToken).toMatch(/^[0-9a-f]{64}$/);
    expect(firstToken).not.toBe(secondToken);

    const rows = getRawDb(db)
      .prepare('SELECT token_hash FROM sessions ORDER BY id')
      .all() as Array<{ token_hash: string }>;
    expect(rows).toEqual([{ token_hash: sha256(firstToken) }, { token_hash: sha256(secondToken) }]);
    expect(rows[0]?.token_hash).not.toBe(rows[1]?.token_hash);
  });

  it('deletes sessions by hashed token', () => {
    const token = db.createSession(60000);
    expect(db.deleteSession(token)).toBe(true);

    const remaining = getRawDb(db).prepare('SELECT COUNT(*) as count FROM sessions').get() as {
      count: number;
    };
    expect(remaining.count).toBe(0);
  });

  it('rejects expired sessions', () => {
    const token = db.createSession(60000);
    getRawDb(db)
      .prepare('UPDATE sessions SET expiresAt = ?')
      .run(Date.now() - 1000);

    expect(db.validateSession(token, 60000)).toBeNull();
  });

  it('touches long-lived sessions after the fifteen-minute cap', () => {
    const sessionTimeoutMs = 7 * 24 * 60 * 60 * 1000;
    const token = db.createSession(sessionTimeoutMs);
    const rawDb = getRawDb(db);
    const before = rawDb.prepare('SELECT lastAccessed, expiresAt FROM sessions LIMIT 1').get() as {
      lastAccessed: number;
      expiresAt: number;
    };

    const agedLastAccessed = before.lastAccessed - 16 * 60 * 1000;
    rawDb
      .prepare('UPDATE sessions SET lastAccessed = ?, expiresAt = ?')
      .run(agedLastAccessed, Date.now() + sessionTimeoutMs);

    const result = db.validateSession(token, sessionTimeoutMs);

    expect(result).not.toBeNull();
    expect(result?.touched).toBe(true);

    const after = rawDb.prepare('SELECT lastAccessed, expiresAt FROM sessions LIMIT 1').get() as {
      lastAccessed: number;
      expiresAt: number;
    };

    expect(after.lastAccessed).toBeGreaterThan(agedLastAccessed);
    expect(after.expiresAt).toBeGreaterThan(Date.now());
  });

  it('does not touch long-lived sessions before the fifteen-minute cap', () => {
    const sessionTimeoutMs = 7 * 24 * 60 * 60 * 1000;
    const token = db.createSession(sessionTimeoutMs);
    const rawDb = getRawDb(db);
    const before = rawDb.prepare('SELECT lastAccessed, expiresAt FROM sessions LIMIT 1').get() as {
      lastAccessed: number;
      expiresAt: number;
    };

    const agedLastAccessed = before.lastAccessed - 14 * 60 * 1000;
    const existingExpiry = Date.now() + sessionTimeoutMs;
    rawDb
      .prepare('UPDATE sessions SET lastAccessed = ?, expiresAt = ?')
      .run(agedLastAccessed, existingExpiry);

    const result = db.validateSession(token, sessionTimeoutMs);

    expect(result).not.toBeNull();
    expect(result?.touched).toBe(false);

    const after = rawDb.prepare('SELECT lastAccessed, expiresAt FROM sessions LIMIT 1').get() as {
      lastAccessed: number;
      expiresAt: number;
    };

    expect(after.lastAccessed).toBe(agedLastAccessed);
    expect(after.expiresAt).toBe(existingExpiry);
  });

  it('cleans up expired sessions only', () => {
    const expiredToken = db.createSession(60000);
    const activeToken = db.createSession(60000);
    const rawDb = getRawDb(db);
    const expiredHash = sha256(expiredToken);
    const activeHash = sha256(activeToken);

    rawDb
      .prepare('UPDATE sessions SET expiresAt = ? WHERE token_hash = ?')
      .run(Date.now() - 1000, expiredHash);
    rawDb
      .prepare('UPDATE sessions SET expiresAt = ? WHERE token_hash = ?')
      .run(Date.now() + 60000, activeHash);

    expect(db.cleanupExpiredSessions()).toBe(1);

    const remaining = rawDb.prepare('SELECT token_hash FROM sessions').all() as Array<{
      token_hash: string;
    }>;
    expect(remaining).toEqual([{ token_hash: activeHash }]);
  });
});

describe('getSessionTouchIntervalMs', () => {
  it('uses one third of the timeout for short-lived sessions', () => {
    expect(getSessionTouchIntervalMs(60000)).toBe(20000);
    expect(getSessionTouchIntervalMs(300000)).toBe(100000);
  });

  it('caps the interval at fifteen minutes for long-lived sessions', () => {
    expect(getSessionTouchIntervalMs(45 * 60 * 1000)).toBe(15 * 60 * 1000);
    expect(getSessionTouchIntervalMs(7 * 24 * 60 * 60 * 1000)).toBe(15 * 60 * 1000);
  });

  it('keeps a small minimum interval for tiny timeouts', () => {
    expect(getSessionTouchIntervalMs(500)).toBe(1000);
    expect(getSessionTouchIntervalMs(1000)).toBe(1000);
    expect(getSessionTouchIntervalMs(2000)).toBe(1000);
  });
});

describe('DB containers', () => {
  let db!: DB;

  beforeEach(() => {
    db = new DB(':memory:');
    db.runMigrations();
  });

  afterEach(() => {
    db.close();
  });

  it('stores and fetches containers by identity including null requestedDigest', () => {
    const container: Omit<DbContainer, 'id'> = {
      name: 'api',
      image: 'example/service',
      tag: 'latest',
      requestedDigest: null,
      registry: 'docker.io',
      localDigest: 'sha256:local-a',
      latestDigest: 'sha256:remote-a',
      status: 'up_to_date',
      lastCheckedAt: 100,
      lastSuccessAt: 90,
      lastUpdateDetectedAt: null,
      createdAt: 80,
      error: null,
    };

    db.upsertContainer(container);

    const stored = db.getContainer('docker.io', 'example/service', 'latest', null);
    expect(stored).not.toBeNull();
    expect(stored?.requestedDigest).toBeNull();
    expect(stored?.image).toBe('example/service');
  });

  it('keeps separate rows for requestedDigest variants', () => {
    db.upsertContainer({
      name: 'api',
      image: 'example/service',
      tag: 'latest',
      requestedDigest: null,
      registry: 'docker.io',
      localDigest: 'sha256:local-a',
      latestDigest: 'sha256:remote-a',
      status: 'up_to_date',
      lastCheckedAt: 100,
      lastSuccessAt: 90,
      lastUpdateDetectedAt: null,
      createdAt: 80,
      error: null,
    });

    db.upsertContainer({
      name: 'api',
      image: 'example/service',
      tag: 'latest',
      requestedDigest: 'sha256:requested-b',
      registry: 'docker.io',
      localDigest: 'sha256:local-b',
      latestDigest: 'sha256:remote-b',
      status: 'outdated',
      lastCheckedAt: 200,
      lastSuccessAt: 190,
      lastUpdateDetectedAt: 195,
      createdAt: 180,
      error: null,
    });

    expect(db.getContainer('docker.io', 'example/service', 'latest', null)?.localDigest).toBe(
      'sha256:local-a',
    );
    expect(
      db.getContainer('docker.io', 'example/service', 'latest', 'sha256:requested-b')?.localDigest,
    ).toBe('sha256:local-b');
    expect(db.getAllContainers()).toHaveLength(2);
  });

  it('preserves historical nullable fields when an upsert provides nulls', () => {
    db.upsertContainer({
      name: 'api',
      image: 'example/service',
      tag: 'latest',
      requestedDigest: null,
      registry: 'docker.io',
      localDigest: 'sha256:local-a',
      latestDigest: 'sha256:remote-a',
      status: 'outdated',
      lastCheckedAt: 100,
      lastSuccessAt: 90,
      lastUpdateDetectedAt: 95,
      createdAt: 80,
      error: 'first error',
    });

    db.upsertContainer({
      name: 'api-renamed',
      image: 'example/service',
      tag: 'latest',
      requestedDigest: null,
      registry: 'docker.io',
      localDigest: 'sha256:local-b',
      latestDigest: null,
      status: 'error',
      lastCheckedAt: 200,
      lastSuccessAt: null,
      lastUpdateDetectedAt: null,
      createdAt: null,
      error: 'second error',
    });

    const stored = db.getContainer('docker.io', 'example/service', 'latest', null);
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe('api-renamed');
    expect(stored?.localDigest).toBe('sha256:local-b');
    expect(stored?.status).toBe('error');
    expect(stored?.lastCheckedAt).toBe(200);
    expect(stored?.error).toBe('second error');
    expect(stored?.latestDigest).toBe('sha256:remote-a');
    expect(stored?.lastSuccessAt).toBe(90);
    expect(stored?.lastUpdateDetectedAt).toBe(95);
    expect(stored?.createdAt).toBe(80);
  });
});

describe('DB migrations', () => {
  let db!: DB;

  afterEach(() => {
    db.close();
  });

  it('is idempotent and creates the expected baseline schema', () => {
    db = new DB(':memory:');

    db.runMigrations();
    db.runMigrations();

    const rawDb = getRawDb(db);
    const migrations = rawDb.prepare('SELECT COUNT(*) as count FROM migrations').get() as {
      count: number;
    };

    expect(migrations.count).toBe(2);
  });
});

describe('DB auth', () => {
  let db!: DB;

  beforeEach(() => {
    db = new DB(':memory:');
    db.runMigrations();
  });

  afterEach(() => {
    db.close();
  });

  it('initializes auth once', async () => {
    expect(db.isAuthInitialized()).toBe(false);
    expect(db.getAuthConfig()).toBeNull();

    expect(await db.initializeAuth('admin', 'password-1')).toBe(true);
    expect(db.isAuthInitialized()).toBe(true);
    const authConfig = db.getAuthConfig();
    expect(authConfig?.username).toBe('admin');
    expect(authConfig?.password_hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPasswordHash(authConfig?.password_hash ?? '', 'password-1')).toBe(true);

    expect(await db.initializeAuth('admin-2', 'password-2')).toBe(false);
    const authConfigAfterSecondAttempt = db.getAuthConfig();
    expect(authConfigAfterSecondAttempt?.username).toBe('admin');
    expect(
      await verifyPasswordHash(authConfigAfterSecondAttempt?.password_hash ?? '', 'password-1'),
    ).toBe(true);
  });

  it('handles concurrent auth initialization attempts', async () => {
    const results = await Promise.all([
      db.initializeAuth('admin-a', 'password-a'),
      db.initializeAuth('admin-b', 'password-b'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((value) => !value)).toHaveLength(1);

    const authConfig = db.getAuthConfig();
    expect(authConfig).not.toBeNull();
    expect(['admin-a', 'admin-b']).toContain(authConfig?.username);
  });
});
