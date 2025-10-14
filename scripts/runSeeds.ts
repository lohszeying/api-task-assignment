import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { waitForDatabase } from './utils/waitForDatabase';

const SEEDS_TABLE = 'data_seeds';
const SEEDS_DIR = path.resolve(process.cwd(), 'seeds');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'task_assignment'
});

const ensureSeedsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SEEDS_TABLE} (
      id TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};

const getAppliedSeeds = async (): Promise<Set<string>> => {
  const result = await pool.query<{ id: string }>(`SELECT id FROM ${SEEDS_TABLE} ORDER BY id`);
  return new Set(result.rows.map((row) => row.id));
};

const applySeed = async (filename: string) => {
  const filePath = path.join(SEEDS_DIR, filename);
  const sql = await fs.readFile(filePath, 'utf-8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(`INSERT INTO ${SEEDS_TABLE} (id) VALUES ($1)`, [filename]);
    await client.query('COMMIT');
    console.log(`Applied seed ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to apply seed ${filename}`, error);
    throw error;
  } finally {
    client.release();
  }
};

const run = async () => {
  try {
    await waitForDatabase(pool);
    await ensureSeedsTable();

    let files: string[];
    try {
      files = await fs.readdir(SEEDS_DIR);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No seeds directory found. Skipping seeding.');
        return;
      }
      throw error;
    }

    const seeds = files.filter((file) => file.endsWith('.sql')).sort();

    if (seeds.length === 0) {
      console.log('No seed files found.');
      return;
    }

    const applied = await getAppliedSeeds();
    const pending = seeds.filter((seed) => !applied.has(seed));

    if (pending.length === 0) {
      console.log('No pending seeds.');
      return;
    }

    for (const seed of pending) {
      await applySeed(seed);
    }
  } catch (error) {
    console.error('Seeding run failed.', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
