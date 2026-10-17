import type { SeatCoordinates } from '../domain/section';
import { VenueNotFoundError } from '../domain/venue-errors';
import type { VenueUnitOfWork } from './ports';

export interface AddSectionCommand {
  venueId: string;
  name: string;
  seats?: SeatCoordinates[];
}

export class AddSection {
  constructor(private readonly unitOfWork: VenueUnitOfWork) {}

  /** Returns the new section's id. */
  async execute(command: AddSectionCommand): Promise<string> {
    return this.unitOfWork.run(async ({ venues, sections }) => {
      const venue = await venues.findById(command.venueId);
      if (venue === null) {
        throw new VenueNotFoundError(command.venueId);
      }

      const section = venue.addSection(command.name);
      section.addSeats(command.seats ?? []);

      await venues.save(venue);
      await sections.save(section);

      return section.id;
    });
  }
}
