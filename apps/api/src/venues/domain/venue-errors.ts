import { DomainError } from '../../shared/domain/domain-error';

export class InvalidNameError extends DomainError {
  readonly code = 'INVALID_NAME';

  constructor(readonly field: 'venue.name' | 'section.name') {
    super(`${field} must not be empty`);
  }
}

export class InvalidSeatCoordinatesError extends DomainError {
  readonly code = 'INVALID_SEAT_COORDINATES';

  constructor(
    readonly row: string,
    readonly number: number,
    reason: string,
  ) {
    super(`Invalid seat (row "${row}", number ${number}): ${reason}`);
  }
}

/**
 * `sectionName` is absent when the violation was detected by the database's unique
 * index (a concurrent write) rather than by the aggregate.
 */
export class DuplicateSectionNameError extends DomainError {
  readonly code = 'DUPLICATE_SECTION_NAME';

  constructor(readonly sectionName?: string) {
    super(
      sectionName === undefined
        ? 'A section with this name already exists in the venue'
        : `A section named "${sectionName}" already exists in the venue`,
    );
  }
}

/** Coordinates are absent when detected by the database's unique index. */
export class DuplicateSeatError extends DomainError {
  readonly code = 'DUPLICATE_SEAT';

  constructor(readonly coordinates?: { row: string; number: number }) {
    super(
      coordinates === undefined
        ? 'A seat with these coordinates already exists in the section'
        : `Seat row "${coordinates.row}" number ${coordinates.number} already exists in the section`,
    );
  }
}

export class VenueNotFoundError extends DomainError {
  readonly code = 'VENUE_NOT_FOUND';

  constructor(readonly venueId: string) {
    super(`Venue ${venueId} not found`);
  }
}

export class SectionNotFoundError extends DomainError {
  readonly code = 'SECTION_NOT_FOUND';

  constructor(readonly sectionId: string) {
    super(`Section ${sectionId} not found`);
  }
}
