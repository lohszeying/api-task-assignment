import { prisma } from '../db/client';
import type { SkillSummary } from '../responseParam/skill';

export const fetchSkills = async (): Promise<SkillSummary[]> => {
  return prisma.skill.findMany({
    select: { skillId: true, skillName: true },
    orderBy: { skillId: 'asc' }
  });
};
