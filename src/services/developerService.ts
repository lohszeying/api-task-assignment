import { prisma } from '../db/client';
import { HttpError } from './errors';
import type { DeveloperListItem } from '../responseParam/developer';

const parseSkillParam = (skillParam: string | undefined): number[] => {
  if (!skillParam) {
    return [];
  }

  const tokens = skillParam
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  // If user sent a parameter but it's empty after trimming, that's an error
  if (tokens.length === 0) {
    throw new HttpError(400, 'Invalid skill query parameter');
  }

  const ids = tokens.map((token) => Number(token));
  if (ids.some((id) => !Number.isFinite(id) || !Number.isInteger(id))) {
    throw new HttpError(400, 'Invalid skill query parameter');
  }

  return ids;
};

export const fetchDevelopers = async (
  skillParam: string | undefined
): Promise<DeveloperListItem[]> => {
  const skillIds = parseSkillParam(skillParam);

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
    select: {
      developerId: true,
      developerName: true,
      skills: {
        select: {
          skill: {
            select: {
              skillId: true,
              skillName: true
            }
          }
        }
      }
    },
    orderBy: { developerName: 'asc' }
  });

  return developers.map(({ developerId, developerName, skills }) => ({
    developerId,
    developerName,
    skills: skills.map(({ skill }) => ({
      skillId: skill.skillId,
      skillName: skill.skillName
    }))
  }));
};
