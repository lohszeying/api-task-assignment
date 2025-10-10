import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getDevelopers = async (_req: Request, res: Response) => {
  try {
    const developers = await prisma.developer.findMany({
      orderBy: { developerName: 'asc' }
    });

    const response = developers.map(({ developerId, developerName }) => ({
      developerId,
      developerName
    }));

    res.json(response);
  } catch (error) {
    console.error('Failed to fetch developers', error);
    res.status(500).json({ message: 'Failed to fetch developers' });
  }
};
