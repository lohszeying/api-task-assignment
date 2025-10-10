import { Express } from 'express';
import healthRoutes from './healthRoutes';

export const registerRoutes = (app: Express) => {
  app.use('/', healthRoutes);
};
