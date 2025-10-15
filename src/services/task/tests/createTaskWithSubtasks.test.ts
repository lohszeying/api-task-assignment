import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { createTaskWithSubtasks } from '../createTaskWithSubtasks';
import { prisma } from '../../../db/client';
import { HttpError } from '../../errors';

type PrismaSkillMock = {
  findMany?: (...args: unknown[]) => unknown;
};

type PrismaTaskMock = {
  deleteMany?: (...args: unknown[]) => unknown;
};

type PrismaTaskSkillMock = {
  createMany?: (...args: unknown[]) => unknown;
};

type PrismaTransaction = <T>(
  callback: (tx: {
    task: {
      findUnique?: (...args: unknown[]) => unknown;
      create?: (...args: unknown[]) => unknown;
    };
    taskSkill: {
      createMany?: (...args: unknown[]) => unknown;
    };
  }) => Promise<T>
) => Promise<T>;

const prismaMock = prisma as unknown as {
  skill: PrismaSkillMock;
  task: PrismaTaskMock;
  taskSkill: PrismaTaskSkillMock;
  $transaction: PrismaTransaction;
};

const originalSkillDelegate = prismaMock.skill;
const originalTaskDelegate = prismaMock.task;
const originalTaskSkillDelegate = prismaMock.taskSkill;
const originalTransaction = prismaMock.$transaction;

test.afterEach(() => {
  prismaMock.skill = originalSkillDelegate;
  prismaMock.task = originalTaskDelegate;
  prismaMock.taskSkill = originalTaskSkillDelegate;
  prismaMock.$transaction = originalTransaction;
});

describe('createTaskWithSubtasks', () => {
  test('requires the request body to be an object', async () => {
    await assert.rejects(
      createTaskWithSubtasks(null as unknown as Record<string, unknown>),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, 400);
        assert.equal(error.message, 'Request body must be an object.');
        return true;
      }
    );
  });

  test('rejects payloads referencing unknown skills', async (t) => {
    const skillFindManyMock = t.mock.fn(async () => [
      { skillId: 1, skillName: 'Frontend' }
    ]);

    prismaMock.skill = { findMany: skillFindManyMock };
    prismaMock.$transaction = (async (callback) => {
      return callback({
        task: {},
        taskSkill: {}
      });
    }) as PrismaTransaction;

    await assert.rejects(
      createTaskWithSubtasks({ title: 'Feature', skills: [1, 999, 1] }),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, 400);
        assert.equal(error.message, 'Unknown skills: 999');
        return true;
      }
    );

    assert.equal(skillFindManyMock.mock.callCount(), 1);
  });
});

