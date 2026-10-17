import type { Prisma } from '../../generated/prisma/client';
import { Venue } from '../domain/venue';
import type { VenueRepository } from '../application/ports';

/** Persists only what changed: never rewrites the venue's sections. */
export class PrismaVenueRepository implements VenueRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findById(id: string): Promise<Venue | null> {
    const row = await this.tx.venue.findUnique({
      where: { id },
      select: { id: true, name: true, sections: { select: { id: true, name: true } } },
    });

    return row === null ? null : Venue.reconstitute(row);
  }

  async save(venue: Venue): Promise<void> {
    const changes = venue.pullChanges();

    if (changes.isNew) {
      await this.tx.venue.create({ data: { id: venue.id, name: venue.name } });
    } else if (changes.renamed) {
      await this.tx.venue.update({ where: { id: venue.id }, data: { name: venue.name } });
    }

    if (changes.addedSections.length > 0) {
      await this.tx.section.createMany({
        data: changes.addedSections.map(({ id, name }) => ({ id, name, venueId: venue.id })),
      });
    }

    for (const { id, name } of changes.renamedSections) {
      await this.tx.section.update({ where: { id }, data: { name } });
    }
  }
}
