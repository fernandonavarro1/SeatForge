# Domain Invariants

These are business and consistency rules that the implementation and tests must preserve.

## Reservation atomicity

For a reservation request containing N seats:

- either all N EventSeats are acquired;
- or none are acquired.

There is no partial reservation.

## Event ownership

Every Reservation belongs to exactly one Event.

Every ReservationItem in a Reservation must reference an EventSeat belonging to that same Event.

## Seat exclusivity

An EventSeat can have at most one active reservation.

For MVP, active means:

- HELD and not expired;
- CONFIRMED.

CANCELLED and EXPIRED do not occupy a seat.

## Expired holds

A HELD reservation with `expiresAt <= now` is no longer entitled to its seats.

A new reservation must be able to acquire those seats even if housekeeping has not yet processed the old reservation.

The reservation operation may transition the stale reservation to EXPIRED as part of its transaction.

## Confirmation

A HELD reservation may be confirmed only if it has not expired.

An expired HELD reservation cannot transition to CONFIRMED.

A CONFIRMED reservation remains confirmed until explicitly cancelled.

## Cancellation

Cancellation applies to the whole Reservation.

ReservationItems are not cancelled individually.

The MVP does not support partial cancellation or seat replacement inside an existing reservation.

## Price history

ReservationItem.unitPrice and currency represent the price acquired at reservation time.

Changing EventPrice later must not change historical ReservationItem values.

## Event publication

Only PUBLISHED events accept reservations.

DRAFT events do not accept customer reservations.

FINISHED events do not accept new reservations.

Published event seat/section configuration is immutable in the MVP.

## Event configuration snapshot

Changes to Venue, Section, or Seat after an Event's configuration has been created must not mutate the event's snapshot.

## Event seat identity

Within an Event, a physical source seat may appear at most once.

Conceptual uniqueness:

- `(eventId, sourceSeatId)`

Within an EventSection, event seat display coordinates must be unique:

- `(eventSectionId, row, number)`

## Pricing uniqueness

An EventSection may have at most one EventPrice for each tariff type.

Conceptual uniqueness:

- `(eventSectionId, type)`

## Currency consistency

Currency is defined at the Event level.

Every EventPrice within an Event is denominated in that Event's currency; EventPrice does not carry its own currency field.

ReservationItem.currency remains an independent historical snapshot, copied from the Event's currency at reservation time.

## Concurrency

Reservation acquisition must not rely on a check-then-insert sequence without transactional protection.

Requested EventSeats are locked in a deterministic order (by `EventSeat.id` ascending) using `SELECT ... FOR UPDATE`.

Active-reservation exclusivity is guaranteed solely by this transactional locking protocol for the MVP — there is no additional database uniqueness constraint acting as a backstop (see ADR-004). This invariant must be covered by concurrency integration tests against real PostgreSQL, not by unit tests alone.

## Expiration housekeeping

The scheduler/cron is not the source of truth for availability.

Its purpose is to transition stale HELD reservations to EXPIRED and keep data clean.

Correctness must remain intact if the scheduler is delayed or temporarily unavailable.

## Idempotency

Reservation creation will support an Idempotency-Key.

Retrying the same logical request with the same key must not create a second reservation.

The exact idempotency schema and retention policy will be finalized during the implementation phase.
