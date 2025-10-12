import { prisma } from '../../db/client';
import type { TaskDetails } from '../../responseParam/task';
import { HttpError } from '../errors';

// Note: Get task by id. Currently unused by frontend.
export const fetchTaskWithTaskId = async (taskId: string): Promise<TaskDetails> => {
  const task = await prisma.task.findUnique({
    where: { taskId },
    include: {
      status: true,
      developer: true,
      skills: { include: { skill: true } },
      parent: {
        select: {
          taskId: true,
          title: true,
          status: { select: { statusName: true, statusId: true } }
        }
      },
      children: {
        select: {
          taskId: true,
          title: true,
          status: { select: { statusName: true, statusId: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!task) {
    throw new HttpError(404, 'Task not found.');
  }

  return {
    taskId: task.taskId,
    title: task.title,
    status: {
      statusId: task.status.statusId,
      statusName: task.status.statusName
    },
    skills: task.skills.map(({ skill }) => skill.skillName),
    developer: task.developer
      ? {
          developerId: task.developer.developerId,
          developerName: task.developer.developerName
        }
      : null,
    parent: task.parent
      ? {
          taskId: task.parent.taskId,
          title: task.parent.title,
          status: {
            statusId: task.parent.status!.statusId,
            statusName: task.parent.status!.statusName
          }
        }
      : undefined,
    children:
      task.children.length > 0
        ? task.children.map((child) => ({
            taskId: child.taskId,
            title: child.title,
            status: {
              statusId: child.status!.statusId,
              statusName: child.status!.statusName
            }
          }))
        : undefined
  };
};

