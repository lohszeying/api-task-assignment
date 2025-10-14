import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { fetchStatuses } from '../statusService';
import { prisma } from '../../db/client';

type PrismaStatusMock = {
  findMany?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as { taskStatus: PrismaStatusMock };
const originalStatusDelegate = prismaMock.taskStatus;

test.afterEach(() => {
  prismaMock.taskStatus = originalStatusDelegate;
});

describe('fetchStatuses', () => {
  test('returns ordered task statuses', async (t) => {
    const findManyMock = t.mock.fn(async () => [
      { statusId: 1, statusName: 'Backlog' },
      { statusId: 2, statusName: 'In Progress' }
    ]);

    prismaMock.taskStatus = { findMany: findManyMock };

    const result = await fetchStatuses();

    assert.equal(findManyMock.mock.callCount(), 1);
    const args = findManyMock.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.deepEqual(args, {
      select: { statusId: true, statusName: true },
      orderBy: { statusId: 'asc' }
    });
    assert.deepEqual(result, [
      { statusId: 1, statusName: 'Backlog' },
      { statusId: 2, statusName: 'In Progress' }
    ]);
  });
});

