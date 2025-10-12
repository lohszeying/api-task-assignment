import { Request, Response } from 'express';
import { fetchDevelopers } from '../services/developerService';
import { handleError } from '../utils/error';

export const getDevelopers = async (req: Request, res: Response) => {
  try {
    const developers = await fetchDevelopers(req.query.skill);
    res.json(developers);
  } catch (error) {
    handleError(error, res, 'Failed to fetch developers');
  }
};
