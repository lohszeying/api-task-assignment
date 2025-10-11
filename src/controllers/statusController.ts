import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getStatuses = async (_req: Request, res: Response) => {
  try {
    const statuses = await prisma.taskStatus.findMany({
      orderBy: { statusId: 'asc' }
    });

    res.json(
      statuses.map(({ statusId, statusName }) => ({
        id: statusId,
        name: statusName
      }))
    );
  } catch (error) {
    console.error('Failed to fetch statuses', error);
    res.status(500).json({ message: 'Failed to fetch statuses' });
  }
};
