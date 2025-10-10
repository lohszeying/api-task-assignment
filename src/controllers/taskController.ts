import { Request, Response } from 'express';
import { prisma } from '../db/client';

interface TaskSummary {
  taskId: string;
  title: string;
  skills: string[];
  status: string;
  assignee: string | null;
}

export const getTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        skills: {
          include: {
            skill: true
          }
        },
        status: true,
        developer: true
      },
      orderBy: {
        title: 'asc'
      }
    });

    const response: TaskSummary[] = tasks.map((task) => ({
      taskId: task.taskId,
      title: task.title,
      skills: task.skills.map((taskSkill) => taskSkill.skill.skillName),
      status: task.status.statusName,
      assignee: task.developer ? task.developer.developerName : null
    }));

    res.json(response);
  } catch (error) {
    console.error('Failed to fetch tasks', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};
