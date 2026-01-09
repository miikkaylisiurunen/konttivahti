import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { DbContainer } from './types';
import { getLogger } from './logger';

const logger = getLogger('DB');

interface Migration {
  name: string;
  sql: string;
}

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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    requestedDigest: string | null,
  ): DbContainer | null {
    const stmt = this.db.prepare(
      `
      SELECT *
      FROM image_cache
      WHERE registry = ? AND image = ? AND tag = ? AND IFNULL(requestedDigest, '') = IFNULL(?, '')
      LIMIT 1
      `,
    );
    const row = stmt.get(registry, image, tag, requestedDigest) as DbContainer | undefined;
    return row ?? null;
  }

  close(): void {
    this.db.close();
  }
}
