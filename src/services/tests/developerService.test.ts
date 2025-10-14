import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { fetchDevelopers } from '../developerService';
import { prisma } from '../../db/client';
import { HttpError } from '../errors';

type PrismaDeveloperMock = {
  findMany?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as { developer: PrismaDeveloperMock };
const originalDeveloperDelegate = prismaMock.developer;

test.afterEach(() => {
  prismaMock.developer = originalDeveloperDelegate;
});

describe('fetchDevelopers', () => {
  test('returns developers without filtering when skill param is missing', async (t) => {
    const findManyMock = t.mock.fn(async () => [
      {
        developerId: 'dev-1',
        developerName: 'Alice',
        skills: [
          { skill: { skillId: 1, skillName: 'Frontend' } },
          { skill: { skillId: 2, skillName: 'Backend' } }
        ]
      }
    ]);

    prismaMock.developer = { findMany: findManyMock };

    const result = await fetchDevelopers(undefined as unknown as string);

    assert.equal(findManyMock.mock.callCount(), 1);
    const args = findManyMock.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.ok(args);
    assert.equal(args.where, undefined);
    assert.deepEqual(result, [
      {
        developerId: 'dev-1',
        developerName: 'Alice',
        skills: [
          { skillId: 1, skillName: 'Frontend' },
          { skillId: 2, skillName: 'Backend' }
        ]
      }
    ]);
  });

  test('filters developers by required skills when provided', async (t) => {
    const findManyMock = t.mock.fn(async () => []);
    prismaMock.developer = { findMany: findManyMock };

    await fetchDevelopers('1, 2 ,3');

    assert.equal(findManyMock.mock.callCount(), 1);
    const args = findManyMock.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.deepEqual(args.where, {
      AND: [
        { skills: { some: { skillId: 1 } } },
        { skills: { some: { skillId: 2 } } },
        { skills: { some: { skillId: 3 } } }
      ]
    });
  });

  test('rejects malformed skill parameters', async () => {
    await assert.rejects(fetchDevelopers(' , '), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.equal(error.message, 'Invalid skill query parameter');
      return true;
    });

    await assert.rejects(fetchDevelopers('abc,2'), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.equal(error.message, 'Invalid skill query parameter');
      return true;
    });
  });
});

