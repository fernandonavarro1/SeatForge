import { VenueNotFoundError } from '../domain/venue-errors';
import type { VenueUnitOfWork } from './ports';

export interface RenameSectionCommand {
  venueId: string;
  sectionId: string;
  name: string;
}

/** Goes through Venue, which owns section-name uniqueness. */
export class RenameSection {
  constructor(private readonly unitOfWork: VenueUnitOfWork) {}

  async execute(command: RenameSectionCommand): Promise<void> {
    await this.unitOfWork.run(async ({ venues }) => {
      const venue = await venues.findById(command.venueId);
      if (venue === null) {
        throw new VenueNotFoundError(command.venueId);
      }

      venue.renameSection(command.sectionId, command.name);
      await venues.save(venue);
    });
  }
}
