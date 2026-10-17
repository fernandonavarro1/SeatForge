import { randomUUID } from 'node:crypto';

import { Section } from './section';
import { comparisonKey, trimmed } from './text';
import { DuplicateSectionNameError, InvalidNameError, SectionNotFoundError } from './venue-errors';

export interface SectionName {
  readonly id: string;
  readonly name: string;
}

/** What the repository must persist; see Venue.pullChanges. */
export interface VenueChanges {
  readonly isNew: boolean;
  readonly renamed: boolean;
  readonly addedSections: readonly SectionName[];
  readonly renamedSections: readonly SectionName[];
}

/**
 * A reusable physical venue: the consistency boundary for section-name
 * uniqueness.
 *
 * It holds only each section's id and name, never seats, so it stays small
 * even for a stadium (see ADR-006). Seats belong to the Section aggregate.
 */
export class Venue {
  private readonly sections: Map<string, SectionName>;
  private isNew: boolean;
  private renamed = false;
  private addedSections: SectionName[] = [];
  private renamedSectionIds = new Set<string>();

  private constructor(
    readonly id: string,
    private currentName: string,
    sections: readonly SectionName[],
    isNew: boolean,
  ) {
    this.sections = new Map(sections.map((section) => [section.id, section]));
    this.isNew = isNew;
  }

  static create(name: string): Venue {
    return new Venue(randomUUID(), validName(name, 'venue.name'), [], true);
  }

  static reconstitute(props: {
    id: string;
    name: string;
    sections: readonly SectionName[];
  }): Venue {
    return new Venue(props.id, props.name, props.sections, false);
  }

  get name(): string {
    return this.currentName;
  }

  get sectionNames(): readonly SectionName[] {
    return [...this.sections.values()];
  }

  rename(name: string): void {
    this.currentName = validName(name, 'venue.name');
    this.renamed = true;
  }

  /** Returns the new, empty Section aggregate that owns the section's seats. */
  addSection(name: string): Section {
    const section: SectionName = { id: randomUUID(), name: validName(name, 'section.name') };
    this.assertNameAvailable(section.name, section.id);

    this.sections.set(section.id, section);
    this.addedSections.push(section);

    return Section.createEmpty(section.id, this.id);
  }

  /** Renaming to the same name in a different letter case is allowed. */
  renameSection(sectionId: string, name: string): void {
    if (!this.sections.has(sectionId)) {
      throw new SectionNotFoundError(sectionId);
    }
    const newName = validName(name, 'section.name');
    this.assertNameAvailable(newName, sectionId);

    this.sections.set(sectionId, { id: sectionId, name: newName });
    if (!this.addedSections.some((section) => section.id === sectionId)) {
      this.renamedSectionIds.add(sectionId);
    }
  }

  /** Changes since the last call; consumed by the repository on save. */
  pullChanges(): VenueChanges {
    const changes: VenueChanges = {
      isNew: this.isNew,
      renamed: this.renamed,
      // Re-read from the map so a section renamed after being added is
      // inserted with its final name.
      addedSections: this.addedSections.map((section) => this.sectionById(section.id)),
      renamedSections: [...this.renamedSectionIds].map((id) => this.sectionById(id)),
    };

    this.isNew = false;
    this.renamed = false;
    this.addedSections = [];
    this.renamedSectionIds = new Set();

    return changes;
  }

  private assertNameAvailable(name: string, ownSectionId: string): void {
    const key = comparisonKey(name);
    for (const section of this.sections.values()) {
      if (section.id !== ownSectionId && comparisonKey(section.name) === key) {
        throw new DuplicateSectionNameError(name);
      }
    }
  }

  private sectionById(id: string): SectionName {
    const section = this.sections.get(id);
    if (section === undefined) {
      throw new SectionNotFoundError(id);
    }
    return section;
  }
}

function validName(name: string, field: InvalidNameError['field']): string {
  const value = trimmed(name);
  if (value === '') {
    throw new InvalidNameError(field);
  }
  return value;
}
