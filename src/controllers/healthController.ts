import { Request, Response } from 'express';
import { getDbHealth } from '../db/client';
import { handleError } from '../utils/error';

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
    handleError(error, res, 'Database connection failed');
  }
};
