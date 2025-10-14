import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';

import { getStatuses } from '../statusController';
import { prisma } from '../../db/client';

type PrismaStatusMock = {
  findMany?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as { taskStatus: PrismaStatusMock };
const originalStatusDelegate = prismaMock.taskStatus;

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
  prismaMock.taskStatus = originalStatusDelegate;
});

describe('statusController.getStatuses', () => {
  test('responds with task statuses', async () => {
    prismaMock.taskStatus = {
      findMany: async () => [
        { statusId: 1, statusName: 'Backlog' },
        { statusId: 2, statusName: 'In Progress' }
      ]
    };

    const { res, getBody, getStatus } = createMockResponse();

    await getStatuses({} as Request, res);

    assert.equal(getStatus(), undefined);
    assert.deepEqual(getBody(), [
      { statusId: 1, statusName: 'Backlog' },
      { statusId: 2, statusName: 'In Progress' }
    ]);
  });

  test('returns 500 when fetching fails', async (t) => {
    prismaMock.taskStatus = {
      findMany: async () => {
        throw new Error('fail');
      }
    };
    const consoleErrorMock = t.mock.method(console, 'error', () => undefined);

    const { res, getBody, getStatus } = createMockResponse();

    await getStatuses({} as Request, res);

    assert.equal(getStatus(), 500);
    assert.deepEqual(getBody(), { message: 'Failed to fetch statuses' });
    assert.equal(consoleErrorMock.mock.callCount(), 1);
    consoleErrorMock.mock.restore();
  });
});
