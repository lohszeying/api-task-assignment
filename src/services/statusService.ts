import { prisma } from '../db/client';

export const fetchStatuses = async () => {
  const statuses = await prisma.taskStatus.findMany({
    orderBy: { statusId: 'asc' }
  });

  return statuses.map(({ statusId, statusName }) => ({
    id: statusId,
    name: statusName
  }));
};

