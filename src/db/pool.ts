import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'task_assignment'
});

export const getDbHealth = async () => {
  const result = await pool.query('SELECT NOW() AS now');
  return result.rows[0].now as string;
};

export const verifyDatabaseConnection = async () => {
  const client = await pool.connect();
  client.release();
};
