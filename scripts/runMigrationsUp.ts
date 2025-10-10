import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'task_assignment'
});

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};

const getRanMigrations = async (): Promise<Set<string>> => {
  const result = await pool.query<{ id: string }>(`SELECT id FROM ${MIGRATIONS_TABLE} ORDER BY id`);
  return new Set(result.rows.map((row) => row.id));
};

const runMigration = async (filename: string) => {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = await fs.readFile(filePath, 'utf-8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (id) VALUES ($1)`, [filename]);
    await client.query('COMMIT');
    console.log(`Applied migration ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to apply migration ${filename}`, error);
    throw error;
  } finally {
    client.release();
  }
};

const run = async () => {
  try {
    await ensureMigrationsTable();

    const files = await fs.readdir(MIGRATIONS_DIR);
    const migrations = files
      .filter((file) => file.endsWith('.up.sql'))
      .sort();

    if (migrations.length === 0) {
      console.log('No migrations found.');
      return;
    }

    const ranMigrations = await getRanMigrations();
    const pending = migrations.filter((migration) => !ranMigrations.has(migration));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const migration of pending) {
      await runMigration(migration);
    }
  } catch (error) {
    console.error('Migration run failed.', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
