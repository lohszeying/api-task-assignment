import 'dotenv/config';
import { createApp } from './app';
import { pool, verifyDatabaseConnection } from './db/pool';

const port = Number(process.env.PORT || 3000);

const app = createApp();

const start = async () => {
  try {
    await verifyDatabaseConnection();
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
