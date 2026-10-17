import type { PrismaClient } from '../../generated/prisma/client';
import type { SeatView, VenueQueries, VenueSummaryView, VenueView } from '../application/ports';

/** Read-side projections; never loads more than the caller asked for. */
export class PrismaVenueQueries implements VenueQueries {
  constructor(private readonly prisma: PrismaClient) {}

  listVenues(): Promise<VenueSummaryView[]> {
    return this.prisma.venue.findMany({
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async getVenue(venueId: string): Promise<VenueView | null> {
    const row = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        name: true,
        sections: {
          select: { id: true, name: true, _count: { select: { seats: true } } },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (row === null) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      sections: row.sections.map(({ id, name, _count }) => ({ id, name, seatCount: _count.seats })),
    };
  }

  async listSectionSeats(sectionId: string): Promise<SeatView[] | null> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        seats: {
          select: { id: true, row: true, number: true },
          orderBy: [{ row: 'asc' }, { number: 'asc' }],
        },
      },
    });

    return section?.seats ?? null;
  }
}
