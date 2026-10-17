import { describe, expect, it } from 'vitest';

import { Venue } from './venue';
import { DuplicateSectionNameError, InvalidNameError, SectionNotFoundError } from './venue-errors';

describe('Venue', () => {
  describe('name', () => {
    it('stores the name trimmed', () => {
      expect(Venue.create('  Palau Sant Jordi  ').name).toBe('Palau Sant Jordi');
    });

    it.each(['', '   '])('rejects an empty name (%j)', (name) => {
      expect(() => Venue.create(name)).toThrow(InvalidNameError);
    });

    it('rejects renaming to an empty name', () => {
      const venue = Venue.create('Palau');

      expect(() => venue.rename(' ')).toThrow(InvalidNameError);
      expect(venue.name).toBe('Palau');
    });
  });

  describe('addSection', () => {
    it('returns an empty Section aggregate belonging to the venue', () => {
      const venue = Venue.create('Palau');

      const section = venue.addSection('Tribuna Norte');

      expect(section.venueId).toBe(venue.id);
      expect(section.seats).toEqual([]);
      expect(venue.sectionNames).toEqual([{ id: section.id, name: 'Tribuna Norte' }]);
    });

    it('rejects an empty section name', () => {
      expect(() => Venue.create('Palau').addSection('  ')).toThrow(InvalidNameError);
    });

    it('rejects a duplicate section name', () => {
      const venue = Venue.create('Palau');
      venue.addSection('Tribuna Norte');

      expect(() => venue.addSection('Tribuna Norte')).toThrow(DuplicateSectionNameError);
    });

    it('treats names differing only in letter case or surrounding spaces as duplicates', () => {
      const venue = Venue.create('Palau');
      venue.addSection('Tribuna Norte');

      expect(() => venue.addSection(' tribuna NORTE ')).toThrow(DuplicateSectionNameError);
    });

    it('treats accented names as distinct', () => {
      const venue = Venue.create('Palau');
      venue.addSection('Tribuna');

      expect(() => venue.addSection('Tribúna')).not.toThrow();
    });

    it('keeps the original letter case for display', () => {
      const venue = Venue.create('Palau');
      venue.addSection('Tribuna NORTE');

      expect(venue.sectionNames[0]?.name).toBe('Tribuna NORTE');
    });
  });

  describe('renameSection', () => {
    it('rejects a name already used by another section', () => {
      const venue = Venue.create('Palau');
      venue.addSection('Norte');
      const sur = venue.addSection('Sur');

      expect(() => venue.renameSection(sur.id, 'norte')).toThrow(DuplicateSectionNameError);
    });

    it('allows changing only the letter case of its own name', () => {
      const venue = Venue.create('Palau');
      const section = venue.addSection('tribuna norte');

      venue.renameSection(section.id, 'Tribuna Norte');

      expect(venue.sectionNames).toEqual([{ id: section.id, name: 'Tribuna Norte' }]);
    });

    it('rejects an unknown section', () => {
      expect(() => Venue.create('Palau').renameSection('missing', 'X')).toThrow(
        SectionNotFoundError,
      );
    });
  });

  describe('pullChanges', () => {
    it('reports a new venue with its added sections, then nothing', () => {
      const venue = Venue.create('Palau');
      const section = venue.addSection('Norte');

      expect(venue.pullChanges()).toEqual({
        isNew: true,
        renamed: false,
        addedSections: [{ id: section.id, name: 'Norte' }],
        renamedSections: [],
      });
      expect(venue.pullChanges()).toEqual({
        isNew: false,
        renamed: false,
        addedSections: [],
        renamedSections: [],
      });
    });

    it('reports renames of existing sections separately from additions', () => {
      const venue = Venue.reconstitute({
        id: 'v1',
        name: 'Palau',
        sections: [{ id: 's1', name: 'Norte' }],
      });

      venue.renameSection('s1', 'Nord');
      venue.rename('Palau Sant Jordi');

      expect(venue.pullChanges()).toEqual({
        isNew: false,
        renamed: true,
        addedSections: [],
        renamedSections: [{ id: 's1', name: 'Nord' }],
      });
    });

    it('inserts a section renamed after being added with its final name', () => {
      const venue = Venue.create('Palau');
      const section = venue.addSection('Norte');
      venue.renameSection(section.id, 'Nord');

      const changes = venue.pullChanges();

      expect(changes.addedSections).toEqual([{ id: section.id, name: 'Nord' }]);
      expect(changes.renamedSections).toEqual([]);
    });
  });
});
