import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Phase 0 integration baseline.
 *
 * This does not test domain behaviour — there is none yet. It proves the
 * chain the rest of the project depends on actually works end to end:
 * Testcontainers starts PostgreSQL, the Prisma 7 driver adapter connects to
 * it, and transactional row locking behaves as ADR-004 assumes.
 */
describe('PostgreSQL integration baseline', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: inject('databaseUrl') }),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects through the Prisma driver adapter', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;

    expect(rows).toEqual([{ ok: 1 }]);
  });

  it('runs the PostgreSQL major version pinned in docker-compose', async () => {
    const [row] = await prisma.$queryRaw<{ version: string }[]>`
      SELECT current_setting('server_version') AS version
    `;

    expect(row?.version).toMatch(/^18\./);
  });

  it('supports SELECT ... FOR UPDATE inside a transaction', async () => {
    // Row locking is the mechanism ADR-004 relies on for seat exclusivity.
    // Phase 4 tests the concurrency semantics; this only proves the harness
    // can hold locks in a transaction at all.
    await prisma.$executeRaw`CREATE TABLE lock_probe (id integer PRIMARY KEY)`;
    await prisma.$executeRaw`INSERT INTO lock_probe (id) VALUES (1), (2)`;

    const locked = await prisma.$transaction(async (tx) => {
      return tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM lock_probe WHERE id IN (1, 2) ORDER BY id FOR UPDATE
      `;
    });

    expect(locked.map((row) => row.id)).toEqual([1, 2]);

    await prisma.$executeRaw`DROP TABLE lock_probe`;
  });
});
