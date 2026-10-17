import { Module } from '@nestjs/common';

import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { AddSeats } from './application/add-seats';
import { AddSection } from './application/add-section';
import { CreateVenue } from './application/create-venue';
import { RenameSection } from './application/rename-section';
import { RenameVenue } from './application/rename-venue';
import { GetVenue, ListSectionSeats, ListVenues } from './application/venue-queries';
import { PrismaVenueQueries } from './infrastructure/prisma-venue-queries';
import { PrismaVenueUnitOfWork } from './infrastructure/prisma-venue-unit-of-work';

/**
 * Wiring only. Use cases are plain classes with no Nest decorators, so the
 * application layer stays framework-independent; factories inject the
 * Prisma adapters behind their ports.
 */
@Module({
  providers: [
    {
      provide: PrismaVenueUnitOfWork,
      useFactory: (prisma: PrismaService) => new PrismaVenueUnitOfWork(prisma),
      inject: [PrismaService],
    },
    {
      provide: PrismaVenueQueries,
      useFactory: (prisma: PrismaService) => new PrismaVenueQueries(prisma),
      inject: [PrismaService],
    },
    ...[CreateVenue, RenameVenue, AddSection, RenameSection, AddSeats].map((UseCase) => ({
      provide: UseCase,
      useFactory: (unitOfWork: PrismaVenueUnitOfWork) => new UseCase(unitOfWork),
      inject: [PrismaVenueUnitOfWork],
    })),
    ...[ListVenues, GetVenue, ListSectionSeats].map((Query) => ({
      provide: Query,
      useFactory: (queries: PrismaVenueQueries) => new Query(queries),
      inject: [PrismaVenueQueries],
    })),
  ],
  exports: [
    CreateVenue,
    RenameVenue,
    AddSection,
    RenameSection,
    AddSeats,
    ListVenues,
    GetVenue,
    ListSectionSeats,
  ],
})
export class VenuesModule {}
