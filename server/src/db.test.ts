import type Database from 'better-sqlite3';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { DB } from './db';
import type { DbContainer } from './types';

function getRawDb(db: DB): Database.Database {
  return (db as unknown as { db: Database.Database }).db;
}

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
    expect(migrations.count).toBe(1);
  });
});
