import { Request, Response } from 'express';
import { fetchSkills } from '../services/skillService';
import { handleError } from '../utils/error';

export const getSkills = async (_req: Request, res: Response) => {
  try {
    const skills = await fetchSkills();
    res.json(skills);
  } catch (error) {
    handleError(error, res, 'Failed to fetch skills');
  }
};
