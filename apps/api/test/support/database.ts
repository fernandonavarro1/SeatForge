import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';

import { PrismaClient } from '../../src/generated/prisma/client';

/** A client connected to the shared Testcontainers database. */
export function createTestPrisma(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('databaseUrl') }) });
}

/** Empties every domain table; call in beforeEach for isolation. */
export async function truncateVenueTables(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`TRUNCATE TABLE seats, sections, venues`;
}

/**
 * Resolves once `parties` callers are waiting. Used to force concurrent
 * transactions to interleave at a chosen point instead of relying on timing.
 */
export function createBarrier(parties: number): () => Promise<void> {
  let waiting = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  return () => {
    waiting += 1;
    if (waiting === parties) {
      release();
    }
    return released;
  };
}
