import { VenueNotFoundError } from '../domain/venue-errors';
import type { VenueUnitOfWork } from './ports';

export interface RenameVenueCommand {
  venueId: string;
  name: string;
}

export class RenameVenue {
  constructor(private readonly unitOfWork: VenueUnitOfWork) {}

  async execute(command: RenameVenueCommand): Promise<void> {
    await this.unitOfWork.run(async ({ venues }) => {
      const venue = await venues.findById(command.venueId);
      if (venue === null) {
        throw new VenueNotFoundError(command.venueId);
      }

      venue.rename(command.name);
      await venues.save(venue);
    });
  }
}
