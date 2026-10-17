import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { PrismaClient } from '../../src/generated/prisma/client';
import { createTestPrisma, truncateVenueTables } from '../support/database';

/**
 * The database is the final integrity guarantee (AGENTS.md). These tests
 * write rows directly, bypassing the domain, to prove each invariant holds
 * even if application code is wrong.
 */
describe('Venue schema constraints (PostgreSQL)', () => {
  let prisma: PrismaClient;
  let venueId: string;
  let sectionId: string;

  beforeAll(() => {
    prisma = createTestPrisma();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateVenueTables(prisma);
    venueId = randomUUID();
    sectionId = randomUUID();
    await prisma.venue.create({ data: { id: venueId, name: 'Palau' } });
    await prisma.section.create({ data: { id: sectionId, venueId, name: 'Tribuna Norte' } });
    await prisma.seat.create({ data: { id: randomUUID(), sectionId, row: 'A', number: 1 } });
  });

  function insertSection(name: string, venue = venueId): Promise<unknown> {
    return prisma.section.create({ data: { id: randomUUID(), venueId: venue, name } });
  }

  function insertSeat(row: string, number: number, section = sectionId): Promise<unknown> {
    return prisma.seat.create({ data: { id: randomUUID(), sectionId: section, row, number } });
  }

  describe('section names', () => {
    it('are unique per venue regardless of letter case', async () => {
      await expect(insertSection('Tribuna Norte')).rejects.toMatchObject({ code: 'P2002' });
      await expect(insertSection('TRIBUNA norte')).rejects.toMatchObject({ code: 'P2002' });
    });

    it('may repeat across venues', async () => {
      const otherVenue = randomUUID();
      await prisma.venue.create({ data: { id: otherVenue, name: 'Wizink' } });

      await expect(insertSection('Tribuna Norte', otherVenue)).resolves.toBeDefined();
    });

    it.each(['', '  ', ' Sur', 'Sur '])('reject empty or untrimmed text (%j)', async (name) => {
      await expect(insertSection(name)).rejects.toThrow(/sections_name_check/);
    });
  });

  describe('venue names', () => {
    it.each(['', ' Palau'])('reject empty or untrimmed text (%j)', async (name) => {
      await expect(prisma.venue.create({ data: { id: randomUUID(), name } })).rejects.toThrow(
        /venues_name_check/,
      );
    });
  });

  describe('seats', () => {
    it('are unique per (section, row, number), with rows compared regardless of case', async () => {
      await expect(insertSeat('A', 1)).rejects.toMatchObject({ code: 'P2002' });
      await expect(insertSeat('a', 1)).rejects.toMatchObject({ code: 'P2002' });
    });

    it('may repeat coordinates in another section', async () => {
      const otherSection = randomUUID();
      await prisma.section.create({ data: { id: otherSection, venueId, name: 'Sur' } });

      await expect(insertSeat('A', 1, otherSection)).resolves.toBeDefined();
    });

    it.each([0, -3])('reject non-positive number %s', async (number) => {
      await expect(insertSeat('B', number)).rejects.toThrow(/seats_number_check/);
    });

    it.each(['', ' B'])('reject empty or untrimmed row (%j)', async (row) => {
      await expect(insertSeat(row, 1)).rejects.toThrow(/seats_row_check/);
    });

    it('must reference an existing section', async () => {
      await expect(insertSeat('B', 1, randomUUID())).rejects.toMatchObject({ code: 'P2003' });
    });
  });

  describe('deletion', () => {
    it('is restricted while children exist', async () => {
      await expect(prisma.section.delete({ where: { id: sectionId } })).rejects.toMatchObject({
        code: 'P2003',
      });
      await expect(prisma.venue.delete({ where: { id: venueId } })).rejects.toMatchObject({
        code: 'P2003',
      });
    });
  });
});
