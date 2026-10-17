import { describe, expect, it } from 'vitest';

import { Section } from './section';
import { DuplicateSeatError, InvalidSeatCoordinatesError } from './venue-errors';

function existingSection(): Section {
  return Section.reconstitute({
    id: 's1',
    venueId: 'v1',
    seats: [{ id: 'seat-1', row: 'A', number: 1 }],
  });
}

describe('Section', () => {
  describe('addSeats', () => {
    it('adds seats with trimmed rows and returns them', () => {
      const section = Section.createEmpty('s1', 'v1');

      const added = section.addSeats([
        { row: ' A ', number: 1 },
        { row: 'A', number: 2 },
      ]);

      expect(added.map(({ row, number }) => ({ row, number }))).toEqual([
        { row: 'A', number: 1 },
        { row: 'A', number: 2 },
      ]);
      expect(section.seats).toHaveLength(2);
    });

    it('rejects a seat that already exists in the section', () => {
      expect(() => existingSection().addSeats([{ row: 'A', number: 1 }])).toThrow(
        DuplicateSeatError,
      );
    });

    it('treats rows differing only in letter case as the same row', () => {
      expect(() => existingSection().addSeats([{ row: 'a', number: 1 }])).toThrow(
        DuplicateSeatError,
      );
    });

    it('rejects a seat duplicated within the same batch', () => {
      const section = Section.createEmpty('s1', 'v1');

      expect(() =>
        section.addSeats([
          { row: 'B', number: 7 },
          { row: 'b', number: 7 },
        ]),
      ).toThrow(DuplicateSeatError);
    });

    it('adds nothing when any seat in the batch is rejected', () => {
      const section = existingSection();

      expect(() =>
        section.addSeats([
          { row: 'B', number: 1 },
          { row: 'A', number: 1 },
        ]),
      ).toThrow(DuplicateSeatError);
      expect(section.seats).toHaveLength(1);
      expect(section.pullAddedSeats()).toEqual([]);
    });

    it.each(['', '  '])('rejects an empty row (%j)', (row) => {
      expect(() => Section.createEmpty('s1', 'v1').addSeats([{ row, number: 1 }])).toThrow(
        InvalidSeatCoordinatesError,
      );
    });

    it.each([0, -1, 1.5, Number.NaN])('rejects number %s', (number) => {
      expect(() => Section.createEmpty('s1', 'v1').addSeats([{ row: 'A', number }])).toThrow(
        InvalidSeatCoordinatesError,
      );
    });

    it('allows the same row and number in different sections', () => {
      const norte = Section.createEmpty('s1', 'v1');
      const sur = Section.createEmpty('s2', 'v1');

      norte.addSeats([{ row: 'A', number: 1 }]);

      expect(() => sur.addSeats([{ row: 'A', number: 1 }])).not.toThrow();
    });
  });

  describe('pullAddedSeats', () => {
    it('returns only seats added since the last call', () => {
      const section = existingSection();
      section.addSeats([{ row: 'A', number: 2 }]);

      expect(section.pullAddedSeats().map((seat) => seat.number)).toEqual([2]);
      expect(section.pullAddedSeats()).toEqual([]);
    });
  });
});
