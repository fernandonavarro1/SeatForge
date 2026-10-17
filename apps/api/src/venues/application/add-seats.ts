import type { SeatCoordinates } from '../domain/section';
import { SectionNotFoundError } from '../domain/venue-errors';
import type { VenueUnitOfWork } from './ports';

export interface AddSeatsCommand {
  sectionId: string;
  seats: SeatCoordinates[];
}

/** Loads only the target section, never the rest of the venue. */
export class AddSeats {
  constructor(private readonly unitOfWork: VenueUnitOfWork) {}

  async execute(command: AddSeatsCommand): Promise<void> {
    await this.unitOfWork.run(async ({ sections }) => {
      const section = await sections.findById(command.sectionId);
      if (section === null) {
        throw new SectionNotFoundError(command.sectionId);
      }

      section.addSeats(command.seats);
      await sections.save(section);
    });
  }
}
