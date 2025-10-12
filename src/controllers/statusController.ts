import { Request, Response } from 'express';
import { fetchStatuses } from '../services/statusService';
import { handleError } from '../utils/error';

export const getStatuses = async (_req: Request, res: Response) => {
  try {
    const statuses = await fetchStatuses();
    res.json(statuses);
  } catch (error) {
    handleError(error, res, 'Failed to fetch statuses');
  }
};
