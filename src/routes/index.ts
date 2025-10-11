import { Express } from 'express';
import healthRoutes from './healthRoutes';
import developerRoutes from './developerRoutes';
import taskRoutes from './taskRoutes';
import skillRoutes from './skillRoutes';
import statusRoutes from './statusRoutes';

export const registerRoutes = (app: Express) => {
  app.use('/', healthRoutes);
  app.use('/developers', developerRoutes);
  app.use('/tasks', taskRoutes);
  app.use('/skills', skillRoutes);
  app.use('/statuses', statusRoutes);
};
