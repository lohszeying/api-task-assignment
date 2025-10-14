import { Pool } from 'pg';

const DEFAULT_MAX_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 1000;

const getEnvNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForDatabase = async (pool: Pool) => {
  const maxAttempts = getEnvNumber(process.env.DB_CONNECTION_RETRIES, DEFAULT_MAX_ATTEMPTS);
  const delayMs = getEnvNumber(process.env.DB_CONNECTION_RETRY_DELAY_MS, DEFAULT_DELAY_MS);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');

      if (attempt > 1) {
        console.log('Database connection established.');
      }

      return;
    } catch (error) {
      if (attempt === 1) {
        console.log('Waiting for database to become ready...');
      }

      if (attempt === maxAttempts) {
        throw error;
      }

      await delay(delayMs);
    }
  }
};
