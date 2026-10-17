import type { Section, SeatCoordinates } from '../domain/section';
import { Venue } from '../domain/venue';
import type { VenueUnitOfWork } from './ports';

export interface CreateVenueCommand {
  name: string;
  sections?: { name: string; seats?: SeatCoordinates[] }[];
}

export interface CreateVenueResult {
  venueId: string;
  /** In the same order as the command's sections. */
  sectionIds: string[];
}

/** Creates a venue with its full layout in one transaction. */
export class CreateVenue {
  constructor(private readonly unitOfWork: VenueUnitOfWork) {}

  async execute(command: CreateVenueCommand): Promise<CreateVenueResult> {
    const venue = Venue.create(command.name);
    const sections: Section[] = (command.sections ?? []).map(({ name, seats }) => {
      const section = venue.addSection(name);
      section.addSeats(seats ?? []);
      return section;
    });

    await this.unitOfWork.run(async ({ venues, sections: sectionRepository }) => {
      // Venue first: it inserts the section rows the seats reference.
      await venues.save(venue);
      for (const section of sections) {
        await sectionRepository.save(section);
      }
    });

    return { venueId: venue.id, sectionIds: sections.map((section) => section.id) };
  }
}
