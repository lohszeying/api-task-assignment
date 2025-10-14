import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';

import { getDevelopers } from '../developerController';
import { prisma } from '../../db/client';

type PrismaDeveloperMock = {
  findMany?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as { developer: PrismaDeveloperMock };
const originalDeveloperDelegate = prismaMock.developer;

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
  prismaMock.developer = originalDeveloperDelegate;
});

describe('developerController.getDevelopers', () => {
  test('responds with fetched developers', async () => {
    prismaMock.developer = {
      findMany: async () => [
        {
          developerId: 'dev-1',
          developerName: 'Alice',
          skills: [{ skill: { skillId: 1, skillName: 'Frontend' } }]
        }
      ]
    };

    const { res, getBody, getStatus } = createMockResponse();
    const req = { query: { skill: '1' } } as unknown as Request;

    await getDevelopers(req, res);

    assert.equal(getStatus(), undefined);
    assert.deepEqual(getBody(), [
      {
        developerId: 'dev-1',
        developerName: 'Alice',
        skills: [{ skillId: 1, skillName: 'Frontend' }]
      }
    ]);
  });

  test('delegates errors to handleError', async () => {
    const { res, getBody, getStatus } = createMockResponse();
    const req = { query: { skill: '  ' } } as unknown as Request;

    await getDevelopers(req, res);

    assert.equal(getStatus(), 400);
    assert.deepEqual(getBody(), { message: 'Invalid skill query parameter' });
  });
});

