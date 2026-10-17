import type { Section } from '../domain/section';
import type { Venue } from '../domain/venue';

// ---------------------------------------------------------------------------
// Write side: aggregates loaded and saved inside one unit of work.
// ---------------------------------------------------------------------------

export interface VenueRepository {
  findById(id: string): Promise<Venue | null>;
  save(venue: Venue): Promise<void>;
}

export interface SectionRepository {
  findById(id: string): Promise<Section | null>;
  /** The section row itself must already exist (saved through its Venue). */
  save(section: Section): Promise<void>;
}

export interface VenueRepositories {
  venues: VenueRepository;
  sections: SectionRepository;
}

/**
 * Runs `work` in one database transaction: everything it saves commits
 * together or not at all.
 *
 * Implementations translate unique-constraint violations raised by
 * concurrent writers into DuplicateSectionNameError / DuplicateSeatError.
 */
export interface VenueUnitOfWork {
  run<T>(work: (repositories: VenueRepositories) => Promise<T>): Promise<T>;
}

// ---------------------------------------------------------------------------
// Read side: projections that bypass the aggregates (see ADR-006).
// ---------------------------------------------------------------------------

export interface VenueSummaryView {
  id: string;
  name: string;
}

export interface VenueView {
  id: string;
  name: string;
  /** Ordered by name. Seats are not loaded; see listSectionSeats. */
  sections: { id: string; name: string; seatCount: number }[];
}

export interface SeatView {
  id: string;
  row: string;
  number: number;
}

export interface VenueQueries {
  listVenues(): Promise<VenueSummaryView[]>;
  getVenue(venueId: string): Promise<VenueView | null>;
  /** Ordered by row, then number. `null` when the section does not exist. */
  listSectionSeats(sectionId: string): Promise<SeatView[] | null>;
}
