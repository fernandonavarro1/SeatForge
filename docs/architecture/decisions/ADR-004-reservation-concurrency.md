# ADR-004: PostgreSQL Transaction and Row Locks for Reservation Concurrency

- Status: Accepted
- Date: 2026-09-14

## Context

The core requirement is that concurrent customers must not acquire the same EventSeat.

A simple check-then-insert approach is race-prone:

1. transaction A checks and sees no active reservation;
2. transaction B checks and sees no active reservation;
3. both attempt to acquire the same seat.

The database must participate in the correctness guarantee.

## Decision

Reservation acquisition uses:

- one PostgreSQL transaction;
- row-level locks on requested EventSeats using `SELECT ... FOR UPDATE`;
- deterministic ordering when locking multiple seats, by `EventSeat.id` ascending;
- the default READ COMMITTED isolation level, relying on explicit `FOR UPDATE` row locks rather than SERIALIZABLE.

Expired HELD reservations are handled transactionally during acquisition.

### Active-reservation exclusivity: locking protocol only (no DB uniqueness backstop)

For the MVP, "an EventSeat has at most one active reservation" is guaranteed **solely** by the application's transactional locking protocol: every operation that can affect seat availability locks the affected EventSeat row(s) with `SELECT ... FOR UPDATE`, in the deterministic order above, before inspecting or changing reservation state.

This is a deliberate decision, not an oversight. Reservation status (HELD/CONFIRMED/CANCELLED/EXPIRED) lives on `Reservation`, not on `ReservationItem` (the row that references `eventSeatId`), and "active" additionally depends on `expiresAt` versus the current time. Expressing this as a single-table database uniqueness constraint would require either denormalizing `Reservation.status` onto `ReservationItem` or a database trigger to keep such a column in sync. Both were considered and explicitly rejected for the MVP to avoid the added synchronization/ceremony; there is intentionally **no** denormalized status column, **no** trigger, and **no** additional active-reservation uniqueness constraint as a database-level backstop.

Standard database constraints are unaffected by this decision and remain in place: foreign keys, `NOT NULL`, and the existing uniqueness constraints that don't have this cross-table/time-dependent problem (e.g. `(sectionId, row, number)`, `(eventSectionId, type)`).

Accepted risk: correctness of seat exclusivity depends entirely on every code path that can affect availability respecting the locking protocol; there is no independent database-level guarantee to fall back on if application code has a bug. Mitigation: this invariant must be covered by concurrency integration tests against real PostgreSQL (per `AGENTS.md`), not unit tests alone.

### Deadlock / serialization-failure policy

When PostgreSQL aborts a reservation transaction with `deadlock_detected` (40P01) or `serialization_failure` (40001), the use-case layer performs a bounded automatic retry: it retries the whole transaction a small fixed number of times (e.g. up to 3) with backoff. Once the retry budget is exhausted, the use case returns/propagates a transient concurrency failure to the caller. The mapping of that failure to an HTTP status (e.g. 409 or another code) is intentionally not decided here — that belongs to the API/presentation layer when it's implemented.

## Rationale

`FOR UPDATE` lets concurrent operations serialize around the same EventSeat resources.

Deterministic lock ordering reduces deadlock risk when multiple reservations request overlapping seat sets.

The database still contributes strong integrity guarantees (foreign keys, structural uniqueness), but for the MVP it is not asked to independently re-verify active-reservation exclusivity — that responsibility belongs entirely to the transactional locking protocol.

## Consequences

Positive:

- strong concurrency guarantees when the locking protocol is followed;
- clear transaction boundary;
- correctness works across multiple application instances;
- business logic does not rely on in-memory synchronization;
- simpler schema — no denormalized status column or trigger to maintain.

Negative:

- row locks can create contention;
- poor transaction design can cause deadlocks or long waits;
- implementation requires real PostgreSQL integration tests;
- no independent database-level backstop for active-reservation exclusivity: a bug in the locking protocol (e.g. a new code path that reads/writes reservation state without acquiring the seat lock) would not be caught by a database constraint, only by tests.

## Revisit when

Load tests demonstrate that PostgreSQL row locking is the bottleneck or requirements change toward a substantially different allocation model.

Any replacement must preserve the same domain invariants.

Revisit the "no database uniqueness backstop" decision specifically if a concurrency bug in production or testing ever traces back to a code path that bypassed the locking protocol — at that point, add a denormalized status column and partial unique index (or a trigger) as an additional guarantee.
