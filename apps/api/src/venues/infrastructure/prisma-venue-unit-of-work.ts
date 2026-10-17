import type { PrismaClient } from '../../generated/prisma/client';
import type { VenueRepositories, VenueUnitOfWork } from '../application/ports';
import { toVenueDomainError } from './prisma-error-mapping';
import { PrismaSectionRepository } from './prisma-section-repository';
import { PrismaVenueRepository } from './prisma-venue-repository';

/**
 * One interactive Prisma transaction per `run`, with repositories bound to
 * it. Default READ COMMITTED isolation is enough here: the unique indexes,
 * not isolation, settle concurrent duplicate writes.
 */
export class PrismaVenueUnitOfWork implements VenueUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(work: (repositories: VenueRepositories) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction((tx) =>
        work({ venues: new PrismaVenueRepository(tx), sections: new PrismaSectionRepository(tx) }),
      );
    } catch (error) {
      throw toVenueDomainError(error);
    }
  }
}
