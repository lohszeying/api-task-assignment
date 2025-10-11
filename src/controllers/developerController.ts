import { Request, Response } from 'express';
import { fetchDevelopers } from '../services/developerService';
import { HttpError } from '../services/errors';

export const getDevelopers = async (req: Request, res: Response) => {
  try {
    const developers = await fetchDevelopers(req.query.skill);
    res.json(developers);
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    console.error('Failed to fetch developers', error);
    res.status(500).json({ message: 'Failed to fetch developers' });
  }
};
