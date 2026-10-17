import { randomUUID } from 'node:crypto';

import { comparisonKey, trimmed } from './text';
import { DuplicateSeatError, InvalidSeatCoordinatesError } from './venue-errors';

export interface SeatCoordinates {
  row: string;
  number: number;
}

export interface Seat {
  readonly id: string;
  readonly row: string;
  readonly number: number;
}

/**
 * A physical section and its seats: the consistency boundary for
 * `(sectionId, row, number)` uniqueness.
 *
 * The section's name is owned by the Venue aggregate, because name
 * uniqueness spans sections. Keeping seats here means adding seats to one
 * section never loads the rest of a large venue (see ADR-006).
 */
export class Section {
  private readonly seatsByKey: Map<string, Seat>;
  private addedSeats: Seat[] = [];

  private constructor(
    readonly id: string,
    readonly venueId: string,
    seats: readonly Seat[],
  ) {
    this.seatsByKey = new Map(seats.map((seat) => [seatKey(seat), seat]));
  }

  /** Only Venue.addSection creates sections, so the name is checked there. */
  static createEmpty(id: string, venueId: string): Section {
    return new Section(id, venueId, []);
  }

  static reconstitute(props: { id: string; venueId: string; seats: readonly Seat[] }): Section {
    return new Section(props.id, props.venueId, props.seats);
  }

  get seats(): readonly Seat[] {
    return [...this.seatsByKey.values()];
  }

  /**
   * All-or-nothing: if any seat in the batch is invalid or duplicated (against
   * existing seats or within the batch), no seat is added.
   */
  addSeats(coordinates: readonly SeatCoordinates[]): readonly Seat[] {
    const batch = new Map<string, Seat>();

    for (const { row, number } of coordinates) {
      const seat: Seat = {
        id: randomUUID(),
        row: validRow(row, number),
        number: validNumber(row, number),
      };
      const key = seatKey(seat);

      if (this.seatsByKey.has(key) || batch.has(key)) {
        throw new DuplicateSeatError({ row: seat.row, number: seat.number });
      }
      batch.set(key, seat);
    }

    for (const [key, seat] of batch) {
      this.seatsByKey.set(key, seat);
    }
    const added = [...batch.values()];
    this.addedSeats.push(...added);

    return added;
  }

  /** Seats added since the last call; consumed by the repository on save. */
  pullAddedSeats(): readonly Seat[] {
    const added = this.addedSeats;
    this.addedSeats = [];
    return added;
  }
}

function seatKey(seat: SeatCoordinates): string {
  return `${comparisonKey(seat.row)}\u0000${seat.number}`;
}

function validRow(row: string, number: number): string {
  const value = trimmed(row);
  if (value === '') {
    throw new InvalidSeatCoordinatesError(row, number, 'row must not be empty');
  }
  return value;
}

function validNumber(row: string, number: number): number {
  if (!Number.isInteger(number) || number <= 0) {
    throw new InvalidSeatCoordinatesError(row, number, 'number must be a positive integer');
  }
  return number;
}
