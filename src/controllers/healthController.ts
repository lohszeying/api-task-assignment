import { Request, Response } from 'express';
import { getDbHealth } from '../db/client';

export const getApiStatus = (_req: Request, res: Response) => {
  res.send('API is running!');
};

export const checkDatabaseHealth = async (_req: Request, res: Response) => {
  try {
    const timestamp = await getDbHealth();
    res.json({
      status: 'ok',
      timestamp
    });
  } catch (error) {
    console.error('Database connectivity check failed', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
};
