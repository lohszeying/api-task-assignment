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

const getLastMigration = async (): Promise<string | null> => {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM ${MIGRATIONS_TABLE} ORDER BY id DESC LIMIT 1`
  );
  return result.rows[0]?.id ?? null;
};

const runDownMigration = async (filename: string) => {
  const baseName = filename.replace(/\.up\.sql$/, '');
  const downFile = path.join(MIGRATIONS_DIR, `${baseName}.down.sql`);

  try {
    await fs.access(downFile);
  } catch {
    throw new Error(`Down migration file not found for ${filename} (${baseName}.down.sql)`);
  }

  const sql = await fs.readFile(downFile, 'utf-8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE id = $1`, [filename]);
    await client.query('COMMIT');
    console.log(`Rolled back migration ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to roll back migration ${filename}`, error);
    throw error;
  } finally {
    client.release();
  }
};

const run = async () => {
  try {
    await ensureMigrationsTable();

    const lastMigration = await getLastMigration();

    if (!lastMigration) {
      console.log('No migrations have been applied.');
      return;
    }

    await runDownMigration(lastMigration);
  } catch (error) {
    console.error('Migration rollback failed.', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
