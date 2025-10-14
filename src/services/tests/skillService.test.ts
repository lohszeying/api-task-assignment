import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { fetchSkills } from '../skillService';
import { prisma } from '../../db/client';

type PrismaSkillMock = {
  findMany?: (...args: unknown[]) => unknown;
};

const prismaMock = prisma as unknown as { skill: PrismaSkillMock };
const originalSkillDelegate = prismaMock.skill;

test.afterEach(() => {
  prismaMock.skill = originalSkillDelegate;
});

describe('fetchSkills', () => {
  test('returns ordered skill summaries', async (t) => {
    const findManyMock = t.mock.fn(async () => [
      { skillId: 1, skillName: 'Frontend' },
      { skillId: 2, skillName: 'Backend' }
    ]);

    prismaMock.skill = { findMany: findManyMock };

    const result = await fetchSkills();

    assert.equal(findManyMock.mock.callCount(), 1);
    const args = findManyMock.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.deepEqual(args, {
      select: { skillId: true, skillName: true },
      orderBy: { skillId: 'asc' }
    });
    assert.deepEqual(result, [
      { skillId: 1, skillName: 'Frontend' },
      { skillId: 2, skillName: 'Backend' }
    ]);
  });
});

