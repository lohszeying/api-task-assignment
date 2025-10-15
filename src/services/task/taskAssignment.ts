import { prisma } from '../../db/client';
import { HttpError } from '../errors';

export const assignDeveloperToTaskService = async (
  taskId: string,
  developerId: string
): Promise<void> => {
  const [task, developer] = await Promise.all([
    prisma.task.findUnique({
      where: { taskId },
      include: { skills: { select: { skillId: true } } }
    }),
    prisma.developer.findUnique({
      where: { developerId },
      include: { skills: { select: { skillId: true } } }
    })
  ]);

  if (!task) {
    throw new HttpError(404, 'Task not found.');
  }

  if (!developer) {
    throw new HttpError(404, 'Developer not found.');
  }

  const requiredSkillIds = task.skills.map((skill) => skill.skillId);

  if (requiredSkillIds.length > 0) {
    const developerSkillSet = new Set(developer.skills.map((skill) => skill.skillId));
    const hasAllSkills = requiredSkillIds.every((skillId) =>
      developerSkillSet.has(skillId)
    );

    if (!hasAllSkills) {
      throw new HttpError(400, 'Developer does not have all skills required for this task.');
    }
  }

  await prisma.task.update({
    where: { taskId },
    data: { developerId }
  });
};

export const unassignDeveloperFromTaskService = async (taskId: string): Promise<void> => {
  await prisma.task.update({
    where: { taskId },
    data: { developerId: null }
  });
};