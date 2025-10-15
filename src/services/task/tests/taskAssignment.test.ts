import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  assignDeveloperToTaskService,
  unassignDeveloperFromTaskService
} from '../taskAssignment';
import { prisma } from '../../../db/client';
import { HttpError } from '../../errors';

type TaskSkill = { skillId: string };
type TaskWithSkills = {
  taskId: string;
  developerId: string | null;
  skills: TaskSkill[];
};
type DeveloperWithSkills = { developerId: string; skills: TaskSkill[] };
type TaskUpdateArgs = {
  where: { taskId: string };
  data: { developerId: string | null };
};

type PrismaTaskMock = {
  findUnique?: (...args: unknown[]) => unknown;
  update?: (args: TaskUpdateArgs) => Promise<unknown>;
};

type PrismaDeveloperMock = {
  findUnique?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as {
  task: PrismaTaskMock;
  developer: PrismaDeveloperMock;
};

const originalTaskDelegate = prismaMock.task;
const originalDeveloperDelegate = prismaMock.developer;

test.afterEach(() => {
  prismaMock.task = originalTaskDelegate;
  prismaMock.developer = originalDeveloperDelegate;
});

describe('assignDeveloperToTaskService', () => {
  test('throws when the task does not exist', async (t) => {
    const findUniqueMock = t.mock.fn(async () => null);
    prismaMock.task = { findUnique: findUniqueMock };

    await assert.rejects(
      assignDeveloperToTaskService('task-missing', 'dev-1'),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, 404);
        assert.equal(error.message, 'Task not found.');
        return true;
      }
    );

    assert.equal(findUniqueMock.mock.callCount(), 1);
  });

  test('assigns when no skills are required', async (t) => {
    const taskFindUniqueMock = t.mock.fn(
      async () =>
        ({
          taskId: 'task-123',
          developerId: null,
          skills: []
        }) as TaskWithSkills
    );
    const taskUpdateMock = t.mock.fn(async (_args: TaskUpdateArgs) => null);
    const developerFindUniqueMock = t.mock.fn(async () => {
      throw new Error('Developer lookup should not be triggered when no skills are required.');
    });

    prismaMock.task = {
      findUnique: taskFindUniqueMock,
      update: taskUpdateMock
    };
    prismaMock.developer = {
      findUnique: developerFindUniqueMock
    };

    await assignDeveloperToTaskService('task-123', 'dev-456');

    assert.equal(taskUpdateMock.mock.callCount(), 1);
    const updateArgs = taskUpdateMock.mock.calls[0].arguments[0];
    assert.deepEqual(updateArgs, {
      where: { taskId: 'task-123' },
      data: { developerId: 'dev-456' }
    });
    assert.equal(developerFindUniqueMock.mock.callCount(), 0);
  });

  test('throws when the developer does not exist', async (t) => {
    const taskFindUniqueMock = t.mock.fn(
      async () =>
        ({
          taskId: 'task-123',
          developerId: null,
          skills: [{ skillId: 'skill-1' }]
        }) as TaskWithSkills
    );
    const developerFindUniqueMock = t.mock.fn(async () => null);
    const taskUpdateMock = t.mock.fn(async (_args: TaskUpdateArgs) => {
      throw new Error('Update should not occur when the developer is missing.');
    });

    prismaMock.task = {
      findUnique: taskFindUniqueMock,
      update: taskUpdateMock
    };
    prismaMock.developer = {
      findUnique: developerFindUniqueMock
    };

    await assert.rejects(
      assignDeveloperToTaskService('task-123', 'dev-missing'),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, 404);
        assert.equal(error.message, 'Developer not found.');
        return true;
      }
    );

    assert.equal(taskFindUniqueMock.mock.callCount(), 1);
    assert.equal(developerFindUniqueMock.mock.callCount(), 1);
    assert.equal(taskUpdateMock.mock.callCount(), 0);
  });

  test('throws when the developer lacks required skills', async (t) => {
    const taskFindUniqueMock = t.mock.fn(
      async () =>
        ({
          taskId: 'task-123',
          developerId: null,
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }]
        }) as TaskWithSkills
    );
    const developerFindUniqueMock = t.mock.fn(
      async () =>
        ({
          developerId: 'dev-1',
          skills: [{ skillId: 'skill-1' }]
        }) as DeveloperWithSkills
    );
    const taskUpdateMock = t.mock.fn(async (_args: TaskUpdateArgs) => {
      throw new Error('Update should not occur when skills do not match.');
    });

    prismaMock.task = {
      findUnique: taskFindUniqueMock,
      update: taskUpdateMock
    };
    prismaMock.developer = {
      findUnique: developerFindUniqueMock
    };

    await assert.rejects(
      assignDeveloperToTaskService('task-123', 'dev-1'),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, 400);
        assert.equal(error.message, 'Developer does not have all skills required for this task.');
        return true;
      }
    );

    assert.equal(taskFindUniqueMock.mock.callCount(), 1);
    assert.equal(developerFindUniqueMock.mock.callCount(), 1);
    assert.equal(taskUpdateMock.mock.callCount(), 0);
  });

  test('assigns when the developer satisfies all requirements', async (t) => {
    const taskFindUniqueMock = t.mock.fn(
      async () =>
        ({
          taskId: 'task-123',
          developerId: null,
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }]
        }) as TaskWithSkills
    );
    const developerFindUniqueMock = t.mock.fn(
      async () =>
        ({
          developerId: 'dev-1',
          skills: [{ skillId: 'skill-2' }, { skillId: 'skill-1' }]
        }) as DeveloperWithSkills
    );
    const taskUpdateMock = t.mock.fn(async (_args: TaskUpdateArgs) => null);

    prismaMock.task = {
      findUnique: taskFindUniqueMock,
      update: taskUpdateMock
    };
    prismaMock.developer = {
      findUnique: developerFindUniqueMock
    };

    // Controller now trims, service receives clean data
    await assignDeveloperToTaskService('task-123', 'dev-1');

    assert.equal(taskUpdateMock.mock.callCount(), 1);
    const updateArgs = taskUpdateMock.mock.calls[0].arguments[0];
    assert.deepEqual(updateArgs, {
      where: { taskId: 'task-123' },
      data: { developerId: 'dev-1' }
    });
    assert.equal(taskFindUniqueMock.mock.callCount(), 1);
    assert.equal(developerFindUniqueMock.mock.callCount(), 1);
  });
});

describe('unassignDeveloperFromTaskService', () => {
  test('clears the developer assignment', async (t) => {
    const taskUpdateMock = t.mock.fn(async (_args: TaskUpdateArgs) => null);

    prismaMock.task = {
      update: taskUpdateMock
    };

    await unassignDeveloperFromTaskService('task-123');

    assert.equal(taskUpdateMock.mock.callCount(), 1);
    const updateArgs = taskUpdateMock.mock.calls[0].arguments[0];
    assert.deepEqual(updateArgs, {
      where: { taskId: 'task-123' },
      data: { developerId: null }
    });
  });

  test('succeeds even when task does not exist (idempotent)', async (t) => {
    const taskUpdateMock = t.mock.fn(async (_args: TaskUpdateArgs) => null);

    prismaMock.task = {
      update: taskUpdateMock
    };

    // No error thrown - operation is idempotent
    await unassignDeveloperFromTaskService('task-missing');

    assert.equal(taskUpdateMock.mock.callCount(), 1);
  });
});
