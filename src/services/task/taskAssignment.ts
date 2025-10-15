import { prisma } from '../../db/client';
import { HttpError } from '../errors';

export const assignDeveloperToTaskService = async (
  taskId: string,
  developerId: string | undefined
): Promise<void> => {
  const developerIdClean = developerId?.trim();
  if (!developerIdClean) {
    throw new HttpError(400, 'developerId is required.');
  }

  const task = await prisma.task.findUnique({
    where: { taskId },
    include: { skills: { select: { skillId: true } } }
  });

  if (!task) {
    throw new HttpError(404, 'Task not found.');
  }

  const requiredSkillIds = task.skills.map((skill) => skill.skillId);
  if (requiredSkillIds.length === 0) {
    await prisma.task.update({
      where: { taskId },
      data: { developerId: developerIdClean }
    });
    return;
  }

  const developer = await prisma.developer.findUnique({
    where: { developerId: developerIdClean },
    include: { skills: { select: { skillId: true } } }
  });

  if (!developer) {
    throw new HttpError(404, 'Developer not found.');
  }

  const developerSkillIds = developer.skills.map((skill) => skill.skillId);
  const developerSkillSet = new Set(developerSkillIds);
  const hasAllSkills = requiredSkillIds.every((skillId) =>
    developerSkillSet.has(skillId)
  );

  if (!hasAllSkills) {
    throw new HttpError(400, 'Developer does not have all skills required for this task.');
  }

  await prisma.task.update({
    where: { taskId },
    data: { developerId: developerIdClean }
  });
};

export const unassignDeveloperFromTaskService = async (taskId: string): Promise<void> => {
  const task = await prisma.task.findUnique({
    where: { taskId },
    select: { taskId: true }
  });

  if (!task) {
    throw new HttpError(404, 'Task not found.');
  }

  await prisma.task.update({
    where: { taskId },
    data: { developerId: null }
  });
};

