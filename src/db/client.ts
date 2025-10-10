import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const verifyDatabaseConnection = async () => {
  await prisma.$connect();
};

export const getDbHealth = async () => {
  const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`;
  return result[0]?.now?.toISOString() ?? null;
};

export const shutdownDatabase = async () => {
  await prisma.$disconnect();
};
