import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getDevelopers = async (req: Request, res: Response) => {
  try {
    const skillParam = req.query.skill;

    if (Array.isArray(skillParam) && skillParam.some((value) => typeof value !== 'string')) {
      return res.status(400).json({ message: 'Invalid skill query parameter' });
    }

    const skillList =
      typeof skillParam === 'string'
        ? skillParam
        : Array.isArray(skillParam)
        ? (skillParam as string[]).join(',')
        : undefined;

    const skillTokens = skillList
      ? skillList
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : [];

    const skillIds = skillTokens.map((token): number => Number(token));

    if (skillList && (skillTokens.length === 0 || skillIds.some((value) => !Number.isFinite(value)))) {
      return res.status(400).json({ message: 'Invalid skill query parameter' });
    }

    const whereClause =
      skillIds.length > 0
        ? {
            AND: skillIds.map((skillId) => ({
              skills: {
                some: { skillId }
              }
            }))
          }
        : undefined;

    const developers = await prisma.developer.findMany({
      where: whereClause,
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
