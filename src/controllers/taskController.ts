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
      orderBy: [{ title: 'asc' }]
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
