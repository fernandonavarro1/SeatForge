import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { PrismaClient } from '../../src/generated/prisma/client';
import { AddSeats } from '../../src/venues/application/add-seats';
import { AddSection } from '../../src/venues/application/add-section';
import { CreateVenue } from '../../src/venues/application/create-venue';
import { RenameSection } from '../../src/venues/application/rename-section';
import { RenameVenue } from '../../src/venues/application/rename-venue';
import { GetVenue, ListSectionSeats, ListVenues } from '../../src/venues/application/venue-queries';
import { Section } from '../../src/venues/domain/section';
import { Venue } from '../../src/venues/domain/venue';
import {
  DuplicateSectionNameError,
  SectionNotFoundError,
  VenueNotFoundError,
} from '../../src/venues/domain/venue-errors';
import { PrismaVenueQueries } from '../../src/venues/infrastructure/prisma-venue-queries';
import { PrismaVenueUnitOfWork } from '../../src/venues/infrastructure/prisma-venue-unit-of-work';
import { createTestPrisma, truncateVenueTables } from '../support/database';

describe('Venue persistence (PostgreSQL)', () => {
  let prisma: PrismaClient;
  let unitOfWork: PrismaVenueUnitOfWork;
  let queries: PrismaVenueQueries;

  beforeAll(() => {
    prisma = createTestPrisma();
    unitOfWork = new PrismaVenueUnitOfWork(prisma);
    queries = new PrismaVenueQueries(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateVenueTables(prisma);
  });

  describe('use cases through the Prisma adapters', () => {
    it('round-trips a venue with sections and seats', async () => {
      const { venueId, sectionIds } = await new CreateVenue(unitOfWork).execute({
        name: 'Palau Sant Jordi',
        sections: [
          {
            name: 'Tribuna Norte',
            seats: [
              { row: 'A', number: 1 },
              { row: 'A', number: 2 },
            ],
          },
          { name: 'Pista' },
        ],
      });

      const venue = await new GetVenue(queries).execute(venueId);

      expect(venue).toEqual({
        id: venueId,
        name: 'Palau Sant Jordi',
        sections: [
          { id: sectionIds[1], name: 'Pista', seatCount: 0 },
          { id: sectionIds[0], name: 'Tribuna Norte', seatCount: 2 },
        ],
      });
    });

    it('adds seats without rewriting existing ones', async () => {
      const {
        sectionIds: [sectionId = ''],
      } = await new CreateVenue(unitOfWork).execute({
        name: 'Palau',
        sections: [{ name: 'Norte', seats: [{ row: 'A', number: 1 }] }],
      });
      const [original] = await prisma.seat.findMany({ where: { sectionId } });

      await new AddSeats(unitOfWork).execute({ sectionId, seats: [{ row: 'A', number: 2 }] });

      const seats = await prisma.seat.findMany({
        where: { sectionId },
        orderBy: { number: 'asc' },
      });
      expect(seats).toHaveLength(2);
      expect(seats[0]).toEqual(original);
    });

    it('adds and renames sections, and renames the venue', async () => {
      const { venueId } = await new CreateVenue(unitOfWork).execute({ name: 'Palau' });

      const sectionId = await new AddSection(unitOfWork).execute({
        venueId,
        name: 'norte',
        seats: [{ row: 'A', number: 1 }],
      });
      await new RenameSection(unitOfWork).execute({ venueId, sectionId, name: 'Norte' });
      await new RenameVenue(unitOfWork).execute({ venueId, name: 'Palau Sant Jordi' });

      expect(await new GetVenue(queries).execute(venueId)).toEqual({
        id: venueId,
        name: 'Palau Sant Jordi',
        sections: [{ id: sectionId, name: 'Norte', seatCount: 1 }],
      });
    });

    it('stores names with their original letter case', async () => {
      const { venueId } = await new CreateVenue(unitOfWork).execute({
        name: 'Palau',
        sections: [{ name: 'Tribuna NORTE' }],
      });

      const venue = await new GetVenue(queries).execute(venueId);

      expect(venue.sections[0]?.name).toBe('Tribuna NORTE');
    });

    it('rejects a duplicate section name loaded from the database', async () => {
      const { venueId } = await new CreateVenue(unitOfWork).execute({
        name: 'Palau',
        sections: [{ name: 'Norte' }],
      });

      await expect(new AddSection(unitOfWork).execute({ venueId, name: 'NORTE' })).rejects.toThrow(
        DuplicateSectionNameError,
      );
    });

    it('rolls back everything when a write fails midway through a unit of work', async () => {
      const venue = Venue.create('Palau');
      venue.addSection('Norte');
      // Seats for a section row that does not exist: the FK fails only after
      // the venue and section rows were written in the same transaction.
      const orphan = Section.createEmpty(randomUUID(), venue.id);
      orphan.addSeats([{ row: 'A', number: 1 }]);

      await expect(
        unitOfWork.run(async ({ venues, sections }) => {
          await venues.save(venue);
          await sections.save(orphan);
        }),
      ).rejects.toThrow();

      expect(await prisma.venue.count()).toBe(0);
      expect(await prisma.section.count()).toBe(0);
    });
  });

  describe('read side', () => {
    it('lists venues by name', async () => {
      await new CreateVenue(unitOfWork).execute({ name: 'Wizink Center' });
      await new CreateVenue(unitOfWork).execute({ name: 'Palau' });

      const venues = await new ListVenues(queries).execute();

      expect(venues.map((venue) => venue.name)).toEqual(['Palau', 'Wizink Center']);
    });

    it('lists a section’s seats ordered by row then number', async () => {
      const {
        sectionIds: [sectionId = ''],
      } = await new CreateVenue(unitOfWork).execute({
        name: 'Palau',
        sections: [
          {
            name: 'Norte',
            seats: [
              { row: 'B', number: 1 },
              { row: 'A', number: 2 },
              { row: 'A', number: 1 },
            ],
          },
        ],
      });

      const seats = await new ListSectionSeats(queries).execute(sectionId);

      expect(seats.map(({ row, number }) => `${row}${number}`)).toEqual(['A1', 'A2', 'B1']);
    });

    it('reports missing venues and sections', async () => {
      await expect(new GetVenue(queries).execute(randomUUID())).rejects.toThrow(VenueNotFoundError);
      await expect(new ListSectionSeats(queries).execute(randomUUID())).rejects.toThrow(
        SectionNotFoundError,
      );
    });
  });
});
