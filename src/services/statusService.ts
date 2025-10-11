import { prisma } from '../db/client';
import type { StatusSummary } from '../responseParam/status';

export const fetchStatuses = async (): Promise<StatusSummary[]> => {
  const statuses = await prisma.taskStatus.findMany({
    select: { statusId: true, statusName: true },
    orderBy: { statusId: 'asc' }
  });

  return statuses;
};
