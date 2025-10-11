import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getSkills = async (_req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({select: { skillId: true, skillName: true }});

    res.json(skills);
  } catch (error) {
    console.error('Failed to fetch skills', error);
    res.status(500).json({ message: 'Failed to fetch skills' });
  }
};
