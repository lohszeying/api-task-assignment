import express from 'express';
import { registerRoutes } from './routes';

export const createApp = () => {
  const app = express();

  app.use(express.json());
  registerRoutes(app);

  return app;
};
