import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';

import { getApiStatus, checkDatabaseHealth } from '../healthController';
import { prisma } from '../../db/client';

type PrismaQueryRawMock = (...args: unknown[]) => unknown;

const prismaMock = prisma as unknown as { $queryRaw: PrismaQueryRawMock };
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
  prismaMock.$queryRaw = originalQueryRaw;
});

describe('healthController', () => {
  test('getApiStatus returns static message', () => {
    const { res, getSendBody } = createMockResponse();

    getApiStatus({} as Request, res);

    assert.equal(getSendBody(), 'API is running!');
  });

  test('checkDatabaseHealth returns db status', async () => {
    prismaMock.$queryRaw = async () => [{ now: new Date('2024-01-01T00:00:00.000Z') }];

    const { res, getBody, getStatus } = createMockResponse();

    await checkDatabaseHealth({} as Request, res);

    assert.equal(getStatus(), undefined);
    assert.deepEqual(getBody(), {
      status: 'ok',
      timestamp: '2024-01-01T00:00:00.000Z'
    });
  });

  test('checkDatabaseHealth delegates errors to handleError', async (t) => {
    prismaMock.$queryRaw = async () => {
      throw new Error('db down');
    };
    const consoleErrorMock = t.mock.method(console, 'error', () => undefined);

    const { res, getBody, getStatus } = createMockResponse();

    await checkDatabaseHealth({} as Request, res);

    assert.equal(getStatus(), 500);
    assert.deepEqual(getBody(), { message: 'Database connection failed' });
    assert.equal(consoleErrorMock.mock.callCount(), 1);
    consoleErrorMock.mock.restore();
  });
});
