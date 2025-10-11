import { Request, Response } from 'express';
import { prisma } from '../db/client';

interface TaskSummary {
  taskId: string;
  title: string;
  skills: string[];
  status: string;
  assignee: string | null;
  subtasks?: TaskSummary[];
}

export const getTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        skills: { include: { skill: true } },
        status: true,
        developer: true
      },
      orderBy: [{ createdAt: 'asc' }]
    });

    const taskMap = new Map<string, TaskSummary>();
    const roots: TaskSummary[] = [];

    for (const task of tasks) {
      taskMap.set(task.taskId, {
        taskId: task.taskId,
        title: task.title,
        skills: task.skills.map(({ skill }) => skill.skillName),
        status: task.status.statusName,
        assignee: task.developer ? task.developer.developerName : null
      });
    }

    for (const task of tasks) {
      const summary = taskMap.get(task.taskId);
      if (!summary) {
        continue;
      }

      if (task.parentTaskId) {
        const parentSummary = taskMap.get(task.parentTaskId);
        if (parentSummary) {
          if (!parentSummary.subtasks) {
            parentSummary.subtasks = [];
          }
          parentSummary.subtasks.push(summary);
        }
      } else {
        roots.push(summary);
      }
    }

    res.json(roots);
  } catch (error) {
    console.error('Failed to fetch tasks', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

export const assignDeveloperToTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { developerId } = req.body as { developerId?: string };

  if (!developerId || typeof developerId !== 'string' || developerId.trim().length === 0) {
    return res.status(400).json({ message: 'developerId is required.' });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { taskId },
      include: {
        skills: {
          select: { skillId: true }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const requiredSkillIds = task.skills.map((skill) => skill.skillId);

    if (requiredSkillIds.length === 0) {
      await prisma.task.update({
        where: { taskId },
        data: { developerId }
      });

      return res.status(204).send();
    }

    const developer = await prisma.developer.findUnique({
      where: { developerId },
      include: {
        skills: {
          select: { skillId: true }
        }
      }
    });

    if (!developer) {
      return res.status(404).json({ message: 'Developer not found.' });
    }

    const developerSkillIds = developer.skills.map((skill) => skill.skillId);
    const hasAllSkills = requiredSkillIds.every((skillId) => developerSkillIds.includes(skillId));

    if (!hasAllSkills) {
      return res.status(400).json({
        message: 'Developer does not have all skills required for this task.'
      });
    }

    await prisma.task.update({
      where: { taskId },
      data: { developerId }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Failed to assign developer to task', error);
    return res.status(500).json({ message: 'Failed to assign developer to task' });
  }
};