import { SectionNotFoundError, VenueNotFoundError } from '../domain/venue-errors';
import type { SeatView, VenueQueries, VenueSummaryView, VenueView } from './ports';

export class ListVenues {
  constructor(private readonly queries: VenueQueries) {}

  execute(): Promise<VenueSummaryView[]> {
    return this.queries.listVenues();
  }
}

export class GetVenue {
  constructor(private readonly queries: VenueQueries) {}

  async execute(venueId: string): Promise<VenueView> {
    const venue = await this.queries.getVenue(venueId);
    if (venue === null) {
      throw new VenueNotFoundError(venueId);
    }
    return venue;
  }
}

export class ListSectionSeats {
  constructor(private readonly queries: VenueQueries) {}

  async execute(sectionId: string): Promise<SeatView[]> {
    const seats = await this.queries.listSectionSeats(sectionId);
    if (seats === null) {
      throw new SectionNotFoundError(sectionId);
    }
    return seats;
  }
}
