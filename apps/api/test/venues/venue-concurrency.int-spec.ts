import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { PrismaClient } from '../../src/generated/prisma/client';
import { CreateVenue } from '../../src/venues/application/create-venue';
import {
  DuplicateSeatError,
  DuplicateSectionNameError,
} from '../../src/venues/domain/venue-errors';
import { PrismaVenueUnitOfWork } from '../../src/venues/infrastructure/prisma-venue-unit-of-work';
import { createBarrier, createTestPrisma, truncateVenueTables } from '../support/database';

/**
 * Configuration writes take no locks: when two transactions both pass the
 * aggregate's in-memory check, the unique index decides the winner and the
 * loser's violation is mapped to the domain error.
 *
 * A barrier makes both transactions load the aggregate before either writes,
 * so the database path is exercised deterministically rather than by luck.
 * Errors raised by the database carry no name/coordinates, which is how the
 * assertions tell them apart from the aggregate's own rejection.
 */
describe('Concurrent venue configuration writes (PostgreSQL)', () => {
  let prisma: PrismaClient;
  let unitOfWork: PrismaVenueUnitOfWork;

  beforeAll(() => {
    prisma = createTestPrisma();
    unitOfWork = new PrismaVenueUnitOfWork(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateVenueTables(prisma);
  });

  it('lets exactly one of two concurrent identical section additions succeed', async () => {
    const { venueId } = await new CreateVenue(unitOfWork).execute({ name: 'Palau' });
    const bothLoaded = createBarrier(2);

    const addNorte = (name: string): Promise<void> =>
      unitOfWork.run(async ({ venues, sections }) => {
        const venue = await venues.findById(venueId);
        await bothLoaded();

        const section = venue!.addSection(name);
        await venues.save(venue!);
        await sections.save(section);
      });

    const results = await Promise.allSettled([addNorte('Norte'), addNorte('NORTE')]);

    const rejected = results.filter((result) => result.status === 'rejected');
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(DuplicateSectionNameError);
    expect((rejected[0]?.reason as DuplicateSectionNameError).sectionName).toBeUndefined();
    expect(await prisma.section.count({ where: { venueId } })).toBe(1);
  });

  it('lets exactly one of two concurrent identical seat additions succeed', async () => {
    const {
      sectionIds: [sectionId = ''],
    } = await new CreateVenue(unitOfWork).execute({ name: 'Palau', sections: [{ name: 'Norte' }] });
    const bothLoaded = createBarrier(2);

    const addSeat = (row: string): Promise<void> =>
      unitOfWork.run(async ({ sections }) => {
        const section = await sections.findById(sectionId);
        await bothLoaded();

        section!.addSeats([
          { row, number: 1 },
          { row: 'Z', number: row === 'A' ? 1 : 2 },
        ]);
        await sections.save(section!);
      });

    const results = await Promise.allSettled([addSeat('A'), addSeat('a')]);

    const rejected = results.filter((result) => result.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(DuplicateSeatError);
    expect((rejected[0]?.reason as DuplicateSeatError).coordinates).toBeUndefined();
    // The loser's whole batch rolled back, including its non-conflicting seat.
    expect(await prisma.seat.count({ where: { sectionId } })).toBe(2);
  });

  it('lets exactly one of two concurrent renames to the same name succeed', async () => {
    const {
      venueId,
      sectionIds: [norte = '', sur = ''],
    } = await new CreateVenue(unitOfWork).execute({
      name: 'Palau',
      sections: [{ name: 'Norte' }, { name: 'Sur' }],
    });
    const bothLoaded = createBarrier(2);

    const renameTo = (sectionId: string): Promise<void> =>
      unitOfWork.run(async ({ venues }) => {
        const venue = await venues.findById(venueId);
        await bothLoaded();

        venue!.renameSection(sectionId, 'Central');
        await venues.save(venue!);
      });

    const results = await Promise.allSettled([renameTo(norte), renameTo(sur)]);

    expect(results.filter((result) => result.status === 'rejected')).toMatchObject([
      { reason: expect.any(DuplicateSectionNameError) as unknown },
    ]);
    expect(await prisma.section.count({ where: { venueId, name: 'Central' } })).toBe(1);
  });
});
