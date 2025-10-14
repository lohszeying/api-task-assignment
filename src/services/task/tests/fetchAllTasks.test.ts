import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchAllTasks } from '../fetchAllTasks';
import { prisma } from '../../../db/client';

type PrismaTaskMock = {
  findMany?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as { task: PrismaTaskMock };
const originalTaskDelegate = prismaMock.task;

test.afterEach(() => {
  prismaMock.task = originalTaskDelegate;
});

test('fetchAllTasks maps hierarchical task data', async (t) => {
  const findManyMock = t.mock.fn(async (_args: unknown) => [
    {
      taskId: 'task-parent',
      title: 'Parent',
      skills: [{ skillId: 1, skill: { skillName: 'Frontend' } }],
      status: { statusId: 1, statusName: 'Backlog' },
      developer: null,
      parentTaskId: null
    },
    {
      taskId: 'task-child',
      title: 'Child',
      skills: [{ skillId: 2, skill: { skillName: 'Backend' } }],
      status: { statusId: 2, statusName: 'In Progress' },
      developer: { developerId: 'dev-1', developerName: 'Alice' },
      parentTaskId: 'task-parent'
    }
  ]);

  prismaMock.task = { findMany: findManyMock };

  const result = await fetchAllTasks();

  assert.equal(findManyMock.mock.callCount(), 1);
  const firstCall = findManyMock.mock.calls[0];
  assert.ok(firstCall);
  const [arg0] = firstCall.arguments;
  assert.ok(arg0 && typeof arg0 === 'object');
  const args = arg0 as Record<string, unknown>;
  assert.deepEqual(args, {
    include: {
      skills: { include: { skill: true } },
      status: true,
      developer: true
    },
    orderBy: [{ createdAt: 'asc' }]
  });

  assert.deepEqual(result, [
    {
      taskId: 'task-parent',
      title: 'Parent',
      skills: [{ skillId: 1, skillName: 'Frontend' }],
      status: { statusId: 1, statusName: 'Backlog' },
      developer: undefined,
      subtasks: [
        {
          taskId: 'task-child',
          title: 'Child',
          skills: [{ skillId: 2, skillName: 'Backend' }],
          status: { statusId: 2, statusName: 'In Progress' },
          developer: { developerId: 'dev-1', developerName: 'Alice' }
        }
      ]
    }
  ]);
});
