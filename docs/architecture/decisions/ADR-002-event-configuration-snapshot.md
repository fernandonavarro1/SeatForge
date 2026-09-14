# ADR-002: Event-Specific Configuration Snapshot

- Status: Accepted
- Date: 2026-09-14

## Context

Venue, Section, and Seat represent reusable physical configuration.

An Event must preserve the configuration that users saw and reserved against at event creation/publication time.

Allowing a later Venue change to mutate a published Event would corrupt historical meaning.

## Decision

Create event-specific configuration:

- EventSection
- EventSeat
- EventPrice

EventSection/EventSeat preserve event-time configuration independently from later changes to the reusable Venue.

The source Section/Seat relationship is retained where useful for provenance, but the event snapshot owns the event-time display/configuration values.

## Consequences

Positive:

- published events remain historically stable;
- reservations remain meaningful;
- venue templates can evolve independently;
- event-specific pricing is straightforward.

Negative:

- duplicated configuration data;
- event creation requires snapshot generation;
- changes to a Venue do not automatically propagate to existing events.

## Revisit when

Only revisit if the product requires sophisticated synchronization/versioning between venue templates and events.
