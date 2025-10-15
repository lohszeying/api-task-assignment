import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';

import {
  getTasks,
  createTask,
  assignDeveloperToTask,
  unassignDeveloperFromTask,
  updateTaskStatus,
  getTaskById
} from '../taskController';
import { prisma } from '../../db/client';
import { TaskStatusId } from '../../services/task';

type PrismaTaskDelegate = {
  findMany?: (...args: unknown[]) => unknown;
  findUnique?: (...args: unknown[]) => unknown;
  update?: (...args: unknown[]) => unknown;
};

type PrismaDeveloperDelegate = {
  findUnique?: (...args: unknown[]) => unknown;
};

type PrismaTaskStatusDelegate = {
  findUnique?: (...args: unknown[]) => unknown;
};

type PrismaSkillDelegate = {
  findMany?: (...args: unknown[]) => unknown;
};

type PrismaTaskSkillDelegate = {
  createMany?: (...args: unknown[]) => unknown;
};

type PrismaTransaction = <T>(
  cb: (tx: {
    task: {
      findUnique?: (...args: unknown[]) => unknown;
      create?: (...args: unknown[]) => unknown;
    };
    taskSkill: {
      createMany?: (...args: unknown[]) => unknown;
    };
  }) => Promise<T>
) => Promise<T>;

type PrismaQueryRaw = (...args: unknown[]) => unknown;

const prismaMock = prisma as unknown as {
  task: PrismaTaskDelegate;
  developer: PrismaDeveloperDelegate;
  taskStatus: PrismaTaskStatusDelegate;
  skill: PrismaSkillDelegate;
  taskSkill: PrismaTaskSkillDelegate;
  $transaction: PrismaTransaction;
  $queryRaw: PrismaQueryRaw;
};

const originalTaskDelegate = prismaMock.task;
const originalDeveloperDelegate = prismaMock.developer;
const originalTaskStatusDelegate = prismaMock.taskStatus;
const originalSkillDelegate = prismaMock.skill;
const originalTaskSkillDelegate = prismaMock.taskSkill;
const originalTransaction = prismaMock.$transaction;
const originalQueryRaw = prismaMock.$queryRaw;

const createMockResponse = () => {
  let statusCode: number | undefined;
  let body: unknown;
  let sendBody: unknown;

  const res: Partial<Response> = {};
  const statusMock = (code: number) => {
    statusCode = code;
    return res as Response;
  };
  const jsonMock = (payload: unknown) => {
    body = payload;
    return res as Response;
  };
  const sendMock = (payload?: unknown) => {
    sendBody = payload;
    return res as Response;
  };

  res.status = statusMock as Response['status'];
  res.json = jsonMock as Response['json'];
  res.send = sendMock as Response['send'];

  return {
    res: res as Response,
    getStatus: () => statusCode,
    getBody: () => body,
    getSendBody: () => sendBody
  };
};

test.afterEach(() => {
  prismaMock.task = originalTaskDelegate;
  prismaMock.developer = originalDeveloperDelegate;
  prismaMock.taskStatus = originalTaskStatusDelegate;
  prismaMock.skill = originalSkillDelegate;
  prismaMock.taskSkill = originalTaskSkillDelegate;
  prismaMock.$transaction = originalTransaction;
  prismaMock.$queryRaw = originalQueryRaw;
});

describe('taskController.getTasks', () => {
  test('responds with hierarchical tasks', async () => {
    prismaMock.task = {
      findMany: async () => [
        {
          taskId: 'task-root',
          title: 'Root',
          skills: [{ skillId: 1, skill: { skillName: 'Frontend' } }],
          status: { statusId: 1, statusName: 'Backlog' },
          developer: null,
          parentTaskId: null
        },
        {
          taskId: 'task-child',
          title: 'Child',
          skills: [],
          status: { statusId: 1, statusName: 'Backlog' },
          developer: null,
          parentTaskId: 'task-root'
        }
      ]
    };

    const { res, getBody, getStatus } = createMockResponse();

    await getTasks({} as Request, res);

    assert.equal(getStatus(), undefined);
    assert.deepEqual(getBody(), [
      {
        taskId: 'task-root',
        title: 'Root',
        skills: [{ skillId: 1, skillName: 'Frontend' }],
        status: { statusId: 1, statusName: 'Backlog' },
        developer: undefined,
        subtasks: [
          {
            taskId: 'task-child',
            title: 'Child',
            skills: [],
            status: { statusId: 1, statusName: 'Backlog' },
            developer: undefined
          }
        ]
      }
    ]);
  });
});

describe('taskController.createTask', () => {
  const setupTransaction = (
    taskCreate: (args: { data: Record<string, unknown> }) => Promise<unknown>
  ) => {
    prismaMock.$transaction = (async (callback) =>
      callback({
        task: {
          findUnique: async () => ({ taskId: 'parent-existing' }),
          create: async (...args: unknown[]) => {
            const [firstArg] = args;
            assert.ok(firstArg && typeof firstArg === 'object');
            return taskCreate(firstArg as { data: Record<string, unknown> });
          }
        },
        taskSkill: {
          createMany: async () => null
        }
      })) as PrismaTransaction;
  };

  test('creates a task with explicit skills', async () => {
    prismaMock.skill = {
      findMany: async () => [
        { skillId: 1, skillName: 'Frontend' },
        { skillId: 2, skillName: 'Backend' }
      ]
    };
    prismaMock.taskSkill = {
      createMany: async () => null
    };

    setupTransaction(async ({ data }) => ({
      taskId: data.title === 'Feature' ? 'task-root' : 'task-child',
      title: data.title,
      statusId: TaskStatusId.Backlog
    }));

    const { res, getStatus, getBody } = createMockResponse();
    const req = {
      params: {},
      body: {
        title: 'Feature',
        skills: [1],
        subtasks: [{ title: 'API', skills: [2] }]
      }
    } as unknown as Request;

    await createTask(req, res);

    const body = getBody();
    assert.equal(getStatus(), 201);
    assert.deepEqual(body, {
      taskId: 'task-root',
      title: 'Feature',
      statusId: TaskStatusId.Backlog,
      developerId: null,
      skills: [{ skillId: 1, skillName: 'Frontend' }],
      subtasks: [
        {
          taskId: 'task-child',
          title: 'API',
          statusId: TaskStatusId.Backlog,
          developerId: null,
          skills: [{ skillId: 2, skillName: 'Backend' }],
          subtasks: undefined
        }
      ]
    });
  });

  test('returns error when payload is invalid', async () => {
    prismaMock.skill = {
      findMany: async () => []
    };
    prismaMock.$transaction = (async (callback) =>
      callback({
        task: {},
        taskSkill: {}
      })) as PrismaTransaction;

    const { res, getStatus, getBody } = createMockResponse();
    const req = {
      params: {},
      body: { title: '   ' }
    } as unknown as Request;

    await createTask(req, res);

    assert.equal(getStatus(), 400);
    assert.deepEqual(getBody(), { message: 'Task title is required.' });
  });
});

describe('taskController.assignDeveloperToTask', () => {
  test('assigns developer and returns 204', async () => {
    prismaMock.task = {
      findUnique: async () => ({
        taskId: 'task-1',
        developerId: null,
        skills: []
      }),
      update: async () => null
    };
    prismaMock.developer = {
      findUnique: async () => ({ developerId: 'dev-1', skills: [] })
    };

    const { res, getStatus, getSendBody } = createMockResponse();
    const req = {
      params: { taskId: 'task-1' },
      body: { developerId: 'dev-1' }
    } as unknown as Request;

    await assignDeveloperToTask(req, res);

    assert.equal(getStatus(), 204);
    assert.equal(getSendBody(), undefined);
  });

  test('propagates validation errors', async () => {
    const { res, getStatus, getBody } = createMockResponse();
    const req = {
      params: { taskId: 'task-1' },
      body: { developerId: '   ' }
    } as unknown as Request;

    await assignDeveloperToTask(req, res);

    assert.equal(getStatus(), 400);
    assert.deepEqual(getBody(), { message: 'developerId is required.' });
  });
});

describe('taskController.unassignDeveloperFromTask', () => {
  test('removes assignment and returns 204', async () => {
    prismaMock.task = {
      update: async () => null
    };

    const { res, getStatus } = createMockResponse();
    const req = { params: { taskId: 'task-1' } } as unknown as Request;

    await unassignDeveloperFromTask(req, res);

    assert.equal(getStatus(), 204);
  });

  test('returns 204 even when task is missing (idempotent)', async () => {
    prismaMock.task = {
      update: async () => null
    };

    const { res, getStatus } = createMockResponse();
    const req = { params: { taskId: 'missing' } } as unknown as Request;

    await unassignDeveloperFromTask(req, res);

    // Idempotent operation - no error even if task doesn't exist
    assert.equal(getStatus(), 204);
  });
});

describe('taskController.updateTaskStatus', () => {
  test('updates to a non-Done status', async () => {
    prismaMock.taskStatus = {
      findUnique: async () => ({ statusId: 2, statusName: 'In Progress' })
    };
    prismaMock.task = {
      findUnique: async () => ({ taskId: 'task-1' }),
      update: async () => null
    };
    prismaMock.$queryRaw = async () => [{ pending_count: BigInt(0) }];

    const { res, getStatus } = createMockResponse();
    const req = {
      params: { taskId: 'task-1' },
      body: { statusId: 2 }
    } as unknown as Request;

    await updateTaskStatus(req, res);

    assert.equal(getStatus(), 204);
  });

  test('returns error when subtasks are pending for Done status', async () => {
    prismaMock.taskStatus = {
      findUnique: async () => ({ statusId: TaskStatusId.Done, statusName: 'Done' })
    };
    prismaMock.task = {
      findUnique: async () => ({ taskId: 'task-1' }),
      update: async () => null
    };
    prismaMock.$queryRaw = async () => [{ pending_count: BigInt(1) }];

    const { res, getStatus, getBody } = createMockResponse();
    const req = {
      params: { taskId: 'task-1' },
      body: { statusId: TaskStatusId.Done }
    } as unknown as Request;

    await updateTaskStatus(req, res);

    assert.equal(getStatus(), 400);
    assert.deepEqual(getBody(), {
      message: 'Cannot mark task as Done until all subtasks are Done.'
    });
  });
});

describe('taskController.getTaskById', () => {
  test('returns task details', async () => {
    prismaMock.task = {
      findUnique: async () => ({
        taskId: 'task-1',
        title: 'Feature',
        status: { statusId: 1, statusName: 'Backlog' },
        developer: null,
        skills: [{ skill: { skillName: 'Frontend' } }],
        parent: null,
        children: []
      })
    };

    const { res, getBody, getStatus } = createMockResponse();
    const req = { params: { taskId: 'task-1' } } as unknown as Request;

    await getTaskById(req, res);

    assert.equal(getStatus(), undefined);
    assert.deepEqual(getBody(), {
      taskId: 'task-1',
      title: 'Feature',
      status: { statusId: 1, statusName: 'Backlog' },
      skills: ['Frontend'],
      developer: null,
      parent: undefined,
      children: undefined
    });
  });

  test('returns 404 when task is missing', async () => {
    prismaMock.task = {
      findUnique: async () => null
    };

    const { res, getStatus, getBody } = createMockResponse();
    const req = { params: { taskId: 'missing' } } as unknown as Request;

    await getTaskById(req, res);

    assert.equal(getStatus(), 404);
    assert.deepEqual(getBody(), { message: 'Task not found.' });
  });
});
