import { beforeEach, describe, expect, it } from 'vitest';

import { Section, type Seat } from '../domain/section';
import { Venue } from '../domain/venue';
import {
  DuplicateSeatError,
  SectionNotFoundError,
  VenueNotFoundError,
} from '../domain/venue-errors';
import { AddSeats } from './add-seats';
import { AddSection } from './add-section';
import { CreateVenue } from './create-venue';
import type { VenueRepositories, VenueUnitOfWork } from './ports';
import { RenameSection } from './rename-section';
import { RenameVenue } from './rename-venue';

/**
 * In-memory stand-in for the database: rows are copied in and out, and a
 * failed unit of work restores the previous state, like a rollback.
 * Constraint and concurrency behaviour is tested against PostgreSQL in
 * test/venues; this only checks use-case orchestration.
 */
class InMemoryVenueStore implements VenueUnitOfWork {
  venues = new Map<string, { id: string; name: string }>();
  sections = new Map<string, { id: string; venueId: string; name: string }>();
  seats = new Map<string, Seat & { sectionId: string }>();

  async run<T>(work: (repositories: VenueRepositories) => Promise<T>): Promise<T> {
    const snapshot = structuredClone({
      venues: this.venues,
      sections: this.sections,
      seats: this.seats,
    });
    try {
      return await work(this.repositories());
    } catch (error) {
      Object.assign(this, snapshot);
      throw error;
    }
  }

  private repositories(): VenueRepositories {
    return {
      venues: {
        findById: (id) => {
          const venue = this.venues.get(id);
          const sections = [...this.sections.values()]
            .filter((section) => section.venueId === id)
            .map(({ id: sectionId, name }) => ({ id: sectionId, name }));
          return Promise.resolve(
            venue === undefined ? null : Venue.reconstitute({ ...venue, sections }),
          );
        },
        save: (venue) => {
          const changes = venue.pullChanges();
          this.venues.set(venue.id, { id: venue.id, name: venue.name });
          for (const section of [...changes.addedSections, ...changes.renamedSections]) {
            this.sections.set(section.id, { ...section, venueId: venue.id });
          }
          return Promise.resolve();
        },
      },
      sections: {
        findById: (id) => {
          const section = this.sections.get(id);
          const seats = [...this.seats.values()].filter((seat) => seat.sectionId === id);
          return Promise.resolve(
            section === undefined ? null : Section.reconstitute({ ...section, seats }),
          );
        },
        save: (section) => {
          for (const seat of section.pullAddedSeats()) {
            this.seats.set(seat.id, { ...seat, sectionId: section.id });
          }
          return Promise.resolve();
        },
      },
    };
  }
}

describe('venue use cases', () => {
  let store: InMemoryVenueStore;

  beforeEach(() => {
    store = new InMemoryVenueStore();
  });

  it('CreateVenue persists the venue, its sections and their seats', async () => {
    const { venueId, sectionIds } = await new CreateVenue(store).execute({
      name: 'Palau',
      sections: [
        { name: 'Norte', seats: [{ row: 'A', number: 1 }] },
        { name: 'Sur', seats: [] },
      ],
    });

    expect(store.venues.get(venueId)?.name).toBe('Palau');
    expect(sectionIds.map((id) => store.sections.get(id)?.name)).toEqual(['Norte', 'Sur']);
    expect([...store.seats.values()]).toMatchObject([
      { sectionId: sectionIds[0], row: 'A', number: 1 },
    ]);
  });

  it('CreateVenue rejects an invalid layout before touching storage', async () => {
    await expect(
      new CreateVenue(store).execute({
        name: 'Palau',
        sections: [
          {
            name: 'Norte',
            seats: [
              { row: 'A', number: 1 },
              { row: 'a', number: 1 },
            ],
          },
        ],
      }),
    ).rejects.toThrow(DuplicateSeatError);

    expect(store.venues.size).toBe(0);
  });

  it('AddSection adds a section with seats to an existing venue', async () => {
    const { venueId } = await new CreateVenue(store).execute({ name: 'Palau' });

    const sectionId = await new AddSection(store).execute({
      venueId,
      name: 'Pista',
      seats: [{ row: '1', number: 1 }],
    });

    expect(store.sections.get(sectionId)).toEqual({ id: sectionId, venueId, name: 'Pista' });
    expect(store.seats.size).toBe(1);
  });

  it('AddSeats adds to an existing section and rejects existing coordinates', async () => {
    const {
      sectionIds: [sectionId = ''],
    } = await new CreateVenue(store).execute({
      name: 'Palau',
      sections: [{ name: 'Norte', seats: [{ row: 'A', number: 1 }] }],
    });
    const addSeats = new AddSeats(store);

    await addSeats.execute({ sectionId, seats: [{ row: 'A', number: 2 }] });
    await expect(addSeats.execute({ sectionId, seats: [{ row: 'a', number: 2 }] })).rejects.toThrow(
      DuplicateSeatError,
    );

    expect(store.seats.size).toBe(2);
  });

  it('RenameVenue and RenameSection update stored names', async () => {
    const {
      venueId,
      sectionIds: [sectionId = ''],
    } = await new CreateVenue(store).execute({ name: 'Palau', sections: [{ name: 'Norte' }] });

    await new RenameVenue(store).execute({ venueId, name: 'Palau Sant Jordi' });
    await new RenameSection(store).execute({ venueId, sectionId, name: 'Nord' });

    expect(store.venues.get(venueId)?.name).toBe('Palau Sant Jordi');
    expect(store.sections.get(sectionId)?.name).toBe('Nord');
  });

  it('reports missing venues and sections', async () => {
    await expect(new AddSection(store).execute({ venueId: 'missing', name: 'X' })).rejects.toThrow(
      VenueNotFoundError,
    );
    await expect(new RenameVenue(store).execute({ venueId: 'missing', name: 'X' })).rejects.toThrow(
      VenueNotFoundError,
    );
    await expect(
      new RenameSection(store).execute({ venueId: 'missing', sectionId: 'x', name: 'X' }),
    ).rejects.toThrow(VenueNotFoundError);
    await expect(new AddSeats(store).execute({ sectionId: 'missing', seats: [] })).rejects.toThrow(
      SectionNotFoundError,
    );
  });
});
