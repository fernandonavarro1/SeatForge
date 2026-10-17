import type { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { AppModule } from '../../src/app.module';
import { CreateVenue } from '../../src/venues/application/create-venue';
import { GetVenue } from '../../src/venues/application/venue-queries';

/**
 * Proves the Nest wiring end to end: environment validation, PrismaService
 * construction (decorator metadata under SWC), and the factories that put
 * the Prisma adapters behind the use cases' ports.
 */
describe('VenuesModule wiring (PostgreSQL)', () => {
  let app: INestApplicationContext;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = inject('databaseUrl');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = await moduleRef.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('resolves use cases backed by the database', async () => {
    const { venueId } = await app.get(CreateVenue).execute({
      name: 'Wiring Arena',
      sections: [{ name: 'Norte', seats: [{ row: 'A', number: 1 }] }],
    });

    const venue = await app.get(GetVenue).execute(venueId);

    expect(venue).toMatchObject({
      name: 'Wiring Arena',
      sections: [{ name: 'Norte', seatCount: 1 }],
    });
  });
});
