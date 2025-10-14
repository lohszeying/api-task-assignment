import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';

import { getSkills } from '../skillController';
import { prisma } from '../../db/client';

type PrismaSkillMock = {
  findMany?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as { skill: PrismaSkillMock };
const originalSkillDelegate = prismaMock.skill;

const createMockResponse = () => {
  let statusCode: number | undefined;
  let body: unknown;

  const res: Partial<Response> = {};
  const statusMock = (code: number) => {
    statusCode = code;
    return res as Response;
  };
  const jsonMock = (payload: unknown) => {
    body = payload;
    return res as Response;
  };

  res.status = statusMock as Response['status'];
  res.json = jsonMock as Response['json'];

  return {
    res: res as Response,
    getStatus: () => statusCode,
    getBody: () => body
  };
};

test.afterEach(() => {
  prismaMock.skill = originalSkillDelegate;
});

describe('skillController.getSkills', () => {
  test('responds with skill summaries', async () => {
    prismaMock.skill = {
      findMany: async () => [
        { skillId: 1, skillName: 'Frontend' },
        { skillId: 2, skillName: 'Backend' }
      ]
    };

    const { res, getBody, getStatus } = createMockResponse();

    await getSkills({} as Request, res);

    assert.equal(getStatus(), undefined);
    assert.deepEqual(getBody(), [
      { skillId: 1, skillName: 'Frontend' },
      { skillId: 2, skillName: 'Backend' }
    ]);
  });

  test('returns 500 when fetching fails', async (t) => {
    prismaMock.skill = {
      findMany: async () => {
        throw new Error('db down');
      }
    };
    const consoleErrorMock = t.mock.method(console, 'error', () => undefined);

    const { res, getBody, getStatus } = createMockResponse();

    await getSkills({} as Request, res);

    assert.equal(getStatus(), 500);
    assert.deepEqual(getBody(), { message: 'Failed to fetch skills' });
    assert.equal(consoleErrorMock.mock.callCount(), 1);
    consoleErrorMock.mock.restore();
  });
});
