import { Request, Response } from 'express';
import { fetchSkills } from '../services/skillService';

export const getSkills = async (_req: Request, res: Response) => {
  try {
    const skills = await fetchSkills();
    res.json(skills);
  } catch (error) {
    console.error('Failed to fetch skills', error);
    res.status(500).json({ message: 'Failed to fetch skills' });
  }
};
