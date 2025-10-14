import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { fetchTaskWithTaskId } from '../fetchTaskWithTaskId';
import { prisma } from '../../../db/client';
import { HttpError } from '../../errors';

type PrismaTaskMock = {
  findUnique?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as { task: PrismaTaskMock };
const originalTaskDelegate = prismaMock.task;

test.afterEach(() => {
  prismaMock.task = originalTaskDelegate;
});

describe('fetchTaskWithTaskId', () => {
  test('throws when the task is not found', async (t) => {
    const findUniqueMock = t.mock.fn(async (_args: unknown) => null);
    prismaMock.task = { findUnique: findUniqueMock };

    await assert.rejects(fetchTaskWithTaskId('missing-id'), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 404);
      assert.equal(error.message, 'Task not found.');
      return true;
    });

    assert.equal(findUniqueMock.mock.callCount(), 1);
    const firstCall = findUniqueMock.mock.calls[0];
    assert.ok(firstCall);
    const [arg0] = firstCall.arguments;
    assert.ok(arg0 && typeof arg0 === 'object');
    const args = arg0 as Record<string, unknown>;
    assert.deepEqual(args.where, { taskId: 'missing-id' });
  });

  test('returns task details with relations', async (t) => {
    const findUniqueMock = t.mock.fn(async (_args: unknown) => ({
      taskId: 'task-123',
      title: 'Build feature',
      status: { statusId: 1, statusName: 'Backlog' },
      developer: { developerId: 'dev-1', developerName: 'Alice' },
      skills: [
        { skill: { skillName: 'Frontend' } },
        { skill: { skillName: 'Backend' } }
      ],
      parent: {
        taskId: 'task-parent',
        title: 'Epic',
        status: { statusId: 0, statusName: 'Planning' }
      },
      children: [
        {
          taskId: 'task-child',
          title: 'Subtask',
          status: { statusId: 2, statusName: 'In Progress' }
        }
      ]
    }));

    prismaMock.task = { findUnique: findUniqueMock };

    const result = await fetchTaskWithTaskId('task-123');

    assert.equal(findUniqueMock.mock.callCount(), 1);
    assert.deepEqual(result, {
      taskId: 'task-123',
      title: 'Build feature',
      status: { statusId: 1, statusName: 'Backlog' },
      skills: ['Frontend', 'Backend'],
      developer: { developerId: 'dev-1', developerName: 'Alice' },
      parent: {
        taskId: 'task-parent',
        title: 'Epic',
        status: { statusId: 0, statusName: 'Planning' }
      },
      children: [
        {
          taskId: 'task-child',
          title: 'Subtask',
          status: { statusId: 2, statusName: 'In Progress' }
        }
      ]
    });
  });
});
