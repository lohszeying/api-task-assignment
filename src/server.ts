import 'dotenv/config';
import { createApp } from './app';
import { shutdownDatabase, verifyDatabaseConnection } from './db/client';
import { validateTaskStatusIds } from './services/task/validateConstants';

const port = Number(process.env.PORT || 3000);

const app = createApp();

const start = async () => {
  try {
    await verifyDatabaseConnection();
    console.log('Connected to Postgres');

    await validateTaskStatusIds();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log('Shutting down server...');
    server.close();
    await shutdownDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();
