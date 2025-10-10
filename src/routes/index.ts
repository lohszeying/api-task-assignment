import { Express } from 'express';
import healthRoutes from './healthRoutes';
import developerRoutes from './developerRoutes';

export const registerRoutes = (app: Express) => {
  app.use('/', healthRoutes);
  app.use('/developers', developerRoutes);
};
