import { Express } from 'express';
import healthRoutes from './healthRoutes';
import developerRoutes from './developerRoutes';
import taskRoutes from './taskRoutes';

export const registerRoutes = (app: Express) => {
  app.use('/', healthRoutes);
  app.use('/developers', developerRoutes);
  app.use('/tasks', taskRoutes);
};
