import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client';
import { HttpError } from '../errors';
import { TaskStatusId } from './constants';

export const updateTaskStatusService = async (
  taskId: string,
  statusId: number | undefined
): Promise<void> => {
  if (statusId === undefined) {
    throw new HttpError(400, 'statusId is required.');
  }

  if (!Number.isInteger(statusId)) {
    throw new HttpError(400, 'statusId must be an integer.');
  }

  const statusRecord = await prisma.taskStatus.findUnique({
    where: { statusId }
  });

  if (!statusRecord) {
    throw new HttpError(404, 'Status not found.');
  }

  const taskExists = await prisma.task.findUnique({
    where: { taskId },
    select: { taskId: true }
  });

  if (!taskExists) {
    throw new HttpError(404, 'Task not found.');
  }

  if (statusId === TaskStatusId.Done) {
    const [result] = await prisma.$queryRaw<{ pending_count: bigint }[]>(
      Prisma.sql`
        WITH RECURSIVE descendants AS (
          SELECT task_id, status_id
          FROM tasks
          WHERE task_id = ${taskId}::uuid
          UNION ALL
          SELECT t.task_id, t.status_id
          FROM tasks t
          INNER JOIN descendants d ON t.parent_task_id = d.task_id
        )
        SELECT COUNT(*)::bigint AS pending_count
        FROM descendants
        WHERE task_id <> ${taskId}::uuid AND status_id <> ${TaskStatusId.Done};
      `
    );

    const pendingCount = Number(result?.pending_count ?? 0);
    if (pendingCount > 0) {
      throw new HttpError(400, 'Cannot mark task as Done until all subtasks are Done.');
    }
  }

  await prisma.task.update({
    where: { taskId },
    data: { statusId }
  });
};
