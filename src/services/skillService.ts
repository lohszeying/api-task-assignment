import { prisma } from '../db/client';

export const fetchSkills = async () => {
  return prisma.skill.findMany({
    select: { skillId: true, skillName: true },
    orderBy: { skillId: 'asc' }
  });
};

