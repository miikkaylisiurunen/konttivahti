import Database from 'better-sqlite3';
import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { ApiSettings, DbContainer } from './types';
import { z } from 'zod';
import { getLogger } from './logger';
import { hashPassword } from './passwordHash';

const logger = getLogger('DB');

export interface Session {
  id: number;
  token_hash: string;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
}

export interface AuthConfigRow {
  username: string;
  password_hash: string;
}

interface Migration {
  name: string;
  sql: string;
}

const JsonStringArray = z
  .string()
  .transform((value) => JSON.parse(value))
  .pipe(z.array(z.string()));

const DbSettingsRow = z.object({
  notifications_enabled: z.number().transform((value) => value === 1),
  notifications_recipients: JsonStringArray,
  notifications_events: JsonStringArray,
});
type DbSettingsRow = z.infer<typeof DbSettingsRow>;

function loadMigrations(): Migration[] {
  const migrationsDir = path.resolve(__dirname, '..', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const fileNames = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  return fileNames.map((fileName) => {
    const fullPath = path.join(migrationsDir, fileName);
    return {
      name: path.basename(fileName, '.sql'),
      sql: fs.readFileSync(fullPath, 'utf8'),
    };
  });
}

function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getSessionTouchIntervalMs(sessionTimeoutMs: number): number {
  return Math.max(1000, Math.min(15 * 60 * 1000, Math.floor(sessionTimeoutMs / 3)));
}

export class DB {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.db.pragma('journal_mode = WAL');
  }

  runMigrations(): void {
    const migrations = loadMigrations();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executedAt INTEGER NOT NULL
      );
    `);

    const executedMigrations = this.db.prepare('SELECT name FROM migrations').all() as Array<{
      name: string;
    }>;
    const executedNames = new Set(executedMigrations.map((m) => m.name));

    for (const migration of migrations) {
      if (!executedNames.has(migration.name)) {
        logger.info({ migration: migration.name }, 'Running migration');
        const tx = this.db.transaction(() => {
          this.db.exec(migration.sql);
          this.db
            .prepare('INSERT INTO migrations (name, executedAt) VALUES (?, ?)')
            .run(migration.name, Date.now());
        });
        tx();
      }
    }
  }

  upsertContainer(data: Omit<DbContainer, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO image_cache (
        name,
        image,
        tag,
        trackedTag,
        requestedDigest,
        registry,
        localDigest,
        latestDigest,
        status,
        lastCheckedAt,
        lastSuccessAt,
        lastUpdateDetectedAt,
        createdAt,
        error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO UPDATE SET
        name = excluded.name,
        localDigest = excluded.localDigest,
        status = excluded.status,
        lastCheckedAt = excluded.lastCheckedAt,
        error = excluded.error,
        latestDigest = COALESCE(excluded.latestDigest, latestDigest),
        lastSuccessAt = COALESCE(excluded.lastSuccessAt, lastSuccessAt),
        lastUpdateDetectedAt = COALESCE(excluded.lastUpdateDetectedAt, lastUpdateDetectedAt),
        createdAt = COALESCE(excluded.createdAt, createdAt)
    `);

    stmt.run(
      data.name,
      data.image,
      data.tag,
      data.trackedTag,
      data.requestedDigest,
      data.registry,
      data.localDigest,
      data.latestDigest,
      data.status,
      data.lastCheckedAt,
      data.lastSuccessAt,
      data.lastUpdateDetectedAt,
      data.createdAt,
      data.error,
    );
  }

  getAllContainers(): DbContainer[] {
    const stmt = this.db.prepare('SELECT * FROM image_cache');
    return stmt.all() as DbContainer[];
  }

  getContainer(
    registry: string,
    image: string,
    tag: string,
    trackedTag: string,
    requestedDigest: string | null,
  ): DbContainer | null {
    const stmt = this.db.prepare(
      `
      SELECT *
      FROM image_cache
      WHERE registry = ?
        AND image = ?
        AND tag = ?
        AND trackedTag = ?
        AND IFNULL(requestedDigest, '') = IFNULL(?, '')
      LIMIT 1
      `,
    );
    const row = stmt.get(registry, image, tag, trackedTag, requestedDigest) as
      | DbContainer
      | undefined;
    return row ?? null;
  }

  createSession(sessionTimeoutMs: number): string {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO sessions (token_hash, createdAt, lastAccessed, expiresAt)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(tokenHash, now, now, now + sessionTimeoutMs);
    return token;
  }

  validateSession(
    token: string,
    sessionTimeoutMs: number,
  ): { session: Session; touched: boolean } | null {
    const now = Date.now();
    const touchIntervalMs = getSessionTouchIntervalMs(sessionTimeoutMs);
    const tokenHash = hashSessionToken(token);

    const selectStmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE token_hash = ? AND expiresAt > ?
    `);

    const session = selectStmt.get(tokenHash, now) as Session | undefined;

    if (!session) {
      return null;
    }

    const shouldTouch = now - session.lastAccessed >= touchIntervalMs;

    if (shouldTouch) {
      const updateStmt = this.db.prepare(`
        UPDATE sessions
        SET lastAccessed = ?, expiresAt = ?
        WHERE token_hash = ?
      `);

      const nextExpiry = now + sessionTimeoutMs;
      updateStmt.run(now, nextExpiry, tokenHash);
      session.lastAccessed = now;
      session.expiresAt = nextExpiry;
    }

    return { session, touched: shouldTouch };
  }

  deleteSession(token: string): boolean {
    const tokenHash = hashSessionToken(token);
    const stmt = this.db.prepare('DELETE FROM sessions WHERE token_hash = ?');
    const result = stmt.run(tokenHash);
    return result.changes > 0;
  }

  cleanupExpiredSessions(): number {
    const now = Date.now();
    const stmt = this.db.prepare('DELETE FROM sessions WHERE expiresAt <= ?');
    const result = stmt.run(now);
    return result.changes;
  }

  isAuthInitialized(): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM auth_config WHERE id = 1 LIMIT 1');
    return Boolean(stmt.get());
  }

  getAuthConfig(): AuthConfigRow | null {
    const stmt = this.db.prepare(
      'SELECT username, password_hash FROM auth_config WHERE id = 1 LIMIT 1',
    );
    const row = stmt.get() as AuthConfigRow | undefined;

    if (!row) {
      return null;
    }

    return row;
  }

  async initializeAuth(username: string, password: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO auth_config (id, username, password_hash, createdAt)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
    const result = stmt.run(username, passwordHash, now);
    return result.changes === 1;
  }

  close(): void {
    this.db.close();
  }

  getSettings(): DbSettingsRow {
    const stmt = this.db.prepare(`
      SELECT
        notifications_enabled,
        notifications_recipients,
        notifications_events
      FROM settings
      WHERE id = 1
    `);
    const rawRow = stmt.get();
    if (!rawRow) {
      throw new Error('Settings row missing');
    }
    const row = DbSettingsRow.parse(rawRow);

    return row;
  }

  setNotificationSettings(settings: ApiSettings): void {
    const stmt = this.db.prepare(`
      UPDATE settings
      SET
        notifications_enabled = ?,
        notifications_recipients = ?,
        notifications_events = ?
      WHERE id = 1
    `);

    const result = stmt.run(
      settings.notifications_enabled ? 1 : 0,
      JSON.stringify(settings.notifications_recipients),
      JSON.stringify(settings.notifications_events),
    );
    if (result.changes === 0) {
      throw new Error('Settings row missing');
    }
  }
}
