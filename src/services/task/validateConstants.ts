import { prisma } from '../../db/client';
import { TaskStatusId } from './constants';

/**
 * Validates that the hardcoded TaskStatusId enum matches the database.
 * This should be called on server startup to catch mismatches early.
 */
export const validateTaskStatusIds = async (): Promise<void> => {
  const statuses = await prisma.taskStatus.findMany({
    select: { statusId: true, statusName: true }
  });

  const statusMap = new Map(statuses.map((s) => [s.statusName, s.statusId]));

  const expectedMappings = [
    { name: 'Backlog', id: TaskStatusId.Backlog },
    { name: 'Ready for development', id: TaskStatusId.ReadyForDevelopment },
    { name: 'In Progress', id: TaskStatusId.InProgress },
    { name: 'Testing', id: TaskStatusId.Testing },
    { name: 'PO Review', id: TaskStatusId.POReview },
    { name: 'Done', id: TaskStatusId.Done }
  ] as const;

  const mismatches: string[] = [];

  for (const { name, id } of expectedMappings) {
    const actualId = statusMap.get(name);
    if (actualId === undefined) {
      mismatches.push(`Status '${name}' not found in database`);
    } else if (actualId !== id) {
      mismatches.push(
        `Status '${name}': expected ID ${id} in code but found ${actualId} in database`
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Task status validation failed:\n${mismatches.map((m) => `  - ${m}`).join('\n')}\n\n` +
        `Please update the TaskStatusId enum in src/services/task/constants.ts ` +
        `to match your database seed data.`
    );
  }

  console.log('✓ Task status IDs validated successfully');
};
