import express, { Request, Response } from 'express';
import 'dotenv/config';
import { Pool } from 'pg';

const app = express();
const port = Number(process.env.PORT || 3000);


const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres'
});

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.send('API is running!');
});

app.get('/db-health', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Database connectivity check failed', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

const start = async () => {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Connected to Postgres');
  } catch (error) {
    console.error('Failed to connect to Postgres', error);
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log('Shutting down server...');
    server.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();
