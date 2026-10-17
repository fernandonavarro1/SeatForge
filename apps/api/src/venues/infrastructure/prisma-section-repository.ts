import type { Prisma } from '../../generated/prisma/client';
import { Section } from '../domain/section';
import type { SectionRepository } from '../application/ports';

/** Seats are immutable once created, so saving only inserts new ones. */
export class PrismaSectionRepository implements SectionRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findById(id: string): Promise<Section | null> {
    const row = await this.tx.section.findUnique({
      where: { id },
      select: {
        id: true,
        venueId: true,
        seats: { select: { id: true, row: true, number: true } },
      },
    });

    return row === null ? null : Section.reconstitute(row);
  }

  async save(section: Section): Promise<void> {
    const added = section.pullAddedSeats();
    if (added.length === 0) {
      return;
    }

    await this.tx.seat.createMany({
      data: added.map(({ id, row, number }) => ({ id, row, number, sectionId: section.id })),
    });
  }
}
