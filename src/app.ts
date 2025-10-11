import express from 'express';
import cors, { CorsOptions } from 'cors';
import { registerRoutes } from './routes';

export const createApp = () => {
  const app = express();

  const env = process.env.NODE_ENV || 'development';
  const allowedOrigins = env === 'development' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : undefined;

  const corsOptions: CorsOptions = allowedOrigins
    ? { origin: allowedOrigins, credentials: true }
    : { origin: false };

  app.use(cors(corsOptions));
  app.use(express.json());
  registerRoutes(app);

  return app;
};
