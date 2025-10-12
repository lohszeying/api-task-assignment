import { prisma } from '../../db/client';
import type { TaskSummary } from '../../responseParam/task';

// Get all tasks
export const fetchTaskHierarchy = async (): Promise<TaskSummary[]> => {
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
      skills: task.skills.map(({ skillId, skill }) => ({
        skillId,
        skillName: skill.skillName
      })),
      status: {
        statusId: task.status.statusId,
        statusName: task.status.statusName
      },
      developer: task.developer
        ? {
            developerId: task.developer.developerId,
            developerName: task.developer.developerName
          }
        : undefined
    });
  }

  for (const task of tasks) {
    const summary = taskMap.get(task.taskId);
    if (!summary) continue;

    if (task.parentTaskId) {
      const parent = taskMap.get(task.parentTaskId);
      if (!parent) continue;
      if (!parent.subtasks) parent.subtasks = [];
      parent.subtasks.push(summary);
    } else {
      roots.push(summary);
    }
  }

  return roots;
};

