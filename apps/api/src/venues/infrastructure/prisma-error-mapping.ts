import { Prisma } from '../../generated/prisma/client';
import { DuplicateSeatError, DuplicateSectionNameError } from '../domain/venue-errors';

/**
 * Index names are pinned with `map:` in schema.prisma so they can be matched
 * here. These violations reach us only when a concurrent transaction won the
 * race; otherwise the aggregates reject duplicates first.
 */
const DOMAIN_ERROR_BY_UNIQUE_INDEX: Record<string, () => Error> = {
  sections_venue_id_name_key: () => new DuplicateSectionNameError(),
  seats_section_id_row_number_key: () => new DuplicateSeatError(),
};

export function toVenueDomainError(error: unknown): unknown {
  const index = violatedUniqueIndex(error);
  const toDomainError = index === undefined ? undefined : DOMAIN_ERROR_BY_UNIQUE_INDEX[index];

  return toDomainError === undefined ? error : toDomainError();
}

/**
 * With a driver adapter, Prisma reports P2002 with the adapter's error under
 * `meta.driverAdapterError.cause.constraint.index` (@prisma/adapter-pg 7.x).
 */
function violatedUniqueIndex(error: unknown): string | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return undefined;
  }

  const adapterError = error.meta?.['driverAdapterError'] as
    { cause?: { constraint?: { index?: unknown } } } | undefined;
  const index = adapterError?.cause?.constraint?.index;

  return typeof index === 'string' ? index : undefined;
}
