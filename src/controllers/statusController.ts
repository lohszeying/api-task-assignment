import { Request, Response } from 'express';
import { fetchStatuses } from '../services/statusService';

export const getStatuses = async (_req: Request, res: Response) => {
  try {
    const statuses = await fetchStatuses();
    res.json(statuses);
  } catch (error) {
    console.error('Failed to fetch statuses', error);
    res.status(500).json({ message: 'Failed to fetch statuses' });
  }
};
