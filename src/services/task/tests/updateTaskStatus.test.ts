import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { updateTaskStatusService } from '../updateTaskStatus';
import { prisma } from '../../../db/client';
import { HttpError } from '../../errors';
import { TaskStatusIds } from '../constants';

type PrismaTaskStatusMock = {
  findUnique?: (...args: unknown[]) => unknown;
};

type PrismaTaskMock = {
  findUnique?: (...args: unknown[]) => unknown;
  update?: (...args: unknown[]) => unknown;
};

type PrismaQueryRawMock = (...args: unknown[]) => unknown;

const prismaMock = prisma as unknown as {
  taskStatus: PrismaTaskStatusMock;
  task: PrismaTaskMock;
  $queryRaw: PrismaQueryRawMock;
};

const originalTaskStatusDelegate = prismaMock.taskStatus;
const originalTaskDelegate = prismaMock.task;
const originalQueryRaw = prismaMock.$queryRaw;

test.afterEach(() => {
  prismaMock.taskStatus = originalTaskStatusDelegate;
  prismaMock.task = originalTaskDelegate;
  prismaMock.$queryRaw = originalQueryRaw;
});

describe('updateTaskStatusService', () => {
  test('requires a statusId', async () => {
    await assert.rejects(updateTaskStatusService('task-1', undefined), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.equal(error.message, 'statusId is required.');
      return true;
    });
  });

  test('rejects non-integer status identifiers', async () => {
    await assert.rejects(updateTaskStatusService('task-1', 'abc'), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.equal(error.message, 'statusId must be an integer.');
      return true;
    });
  });

  test('throws when the status does not exist', async (t) => {
    const taskStatusFindUniqueMock = t.mock.fn(async () => null);
    prismaMock.taskStatus = { findUnique: taskStatusFindUniqueMock };

    await assert.rejects(updateTaskStatusService('task-1', 99), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 404);
      assert.equal(error.message, 'Status not found.');
      return true;
    });

    assert.equal(taskStatusFindUniqueMock.mock.callCount(), 1);
  });

  test('throws when the task does not exist', async (t) => {
    const taskStatusFindUniqueMock = t.mock.fn(async () => ({ statusId: 1 }));
    const taskFindUniqueMock = t.mock.fn(async () => null);

    prismaMock.taskStatus = { findUnique: taskStatusFindUniqueMock };
    prismaMock.task = { findUnique: taskFindUniqueMock };

    await assert.rejects(updateTaskStatusService('missing-task', 1), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 404);
      assert.equal(error.message, 'Task not found.');
      return true;
    });

    assert.equal(taskStatusFindUniqueMock.mock.callCount(), 1);
    assert.equal(taskFindUniqueMock.mock.callCount(), 1);
  });

  test('prevents marking task as Done when subtasks are pending', async (t) => {
    const taskStatusFindUniqueMock = t.mock.fn(async () => ({
      statusId: TaskStatusIds.Done
    }));
    const taskFindUniqueMock = t.mock.fn(async () => ({ taskId: 'task-1' }));
    const queryRawMock = t.mock.fn(async () => [{ pending_count: BigInt(2) }]);

    prismaMock.taskStatus = { findUnique: taskStatusFindUniqueMock };
    prismaMock.task = { findUnique: taskFindUniqueMock };
    prismaMock.$queryRaw = queryRawMock;

    await assert.rejects(updateTaskStatusService('task-1', TaskStatusIds.Done), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.equal(
        error.message,
        'Cannot mark task as Done until all subtasks are Done.'
      );
      return true;
    });

    assert.equal(taskStatusFindUniqueMock.mock.callCount(), 1);
    assert.equal(taskFindUniqueMock.mock.callCount(), 1);
    assert.equal(queryRawMock.mock.callCount(), 1);
  });

  test('updates task status successfully', async (t) => {
    const taskStatusFindUniqueMock = t.mock.fn(async () => ({
      statusId: 3
    }));
    const taskFindUniqueMock = t.mock.fn(async () => ({ taskId: 'task-1' }));
    const queryRawMock = t.mock.fn(async () => [{ pending_count: BigInt(0) }]);
    const taskUpdateMock = t.mock.fn(async () => null);

    prismaMock.taskStatus = { findUnique: taskStatusFindUniqueMock };
    prismaMock.task = {
      findUnique: taskFindUniqueMock,
      update: taskUpdateMock
    };
    prismaMock.$queryRaw = queryRawMock;

    await updateTaskStatusService('task-1', '3');

    assert.equal(taskStatusFindUniqueMock.mock.callCount(), 1);
    assert.equal(taskFindUniqueMock.mock.callCount(), 1);
    assert.equal(queryRawMock.mock.callCount(), 0);
    assert.equal(taskUpdateMock.mock.callCount(), 1);
    const updateArgs = taskUpdateMock.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.deepEqual(updateArgs, {
      where: { taskId: 'task-1' },
      data: { statusId: 3 }
    });
  });

  test('allows Done status when no pending subtasks remain', async (t) => {
    const taskStatusFindUniqueMock = t.mock.fn(async () => ({
      statusId: TaskStatusIds.Done
    }));
    const taskFindUniqueMock = t.mock.fn(async () => ({ taskId: 'task-1' }));
    const queryRawMock = t.mock.fn(async () => [{ pending_count: BigInt(0) }]);
    const taskUpdateMock = t.mock.fn(async () => null);

    prismaMock.taskStatus = { findUnique: taskStatusFindUniqueMock };
    prismaMock.task = {
      findUnique: taskFindUniqueMock,
      update: taskUpdateMock
    };
    prismaMock.$queryRaw = queryRawMock;

    await updateTaskStatusService('task-1', TaskStatusIds.Done);

    assert.equal(queryRawMock.mock.callCount(), 1);
    assert.equal(taskUpdateMock.mock.callCount(), 1);
    const updateArgs = taskUpdateMock.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.deepEqual(updateArgs, {
      where: { taskId: 'task-1' },
      data: { statusId: TaskStatusIds.Done }
    });
  });
});
