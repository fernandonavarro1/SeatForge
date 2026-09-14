# ADR-003: Reservations Are Atomic

- Status: Accepted
- Date: 2026-09-14

## Context

A customer can request multiple seats in one reservation.

Partial acquisition would create poor user semantics and significantly increase the number of intermediate states the system must handle.

## Decision

A Reservation is an atomic unit.

If the customer requests A1, A2, and A3:

- all three are acquired;
- or none are acquired.

ReservationItems cannot be partially confirmed or cancelled in the MVP.

## Rationale

Atomicity provides:

- predictable user behavior;
- simpler state transitions;
- simpler cancellation/confirmation;
- fewer partial-failure scenarios;
- a clear database transaction boundary.

## Consequences

Positive:

- simpler domain model;
- simpler API semantics;
- easier concurrency reasoning.

Negative:

- a request fails entirely if one requested seat is unavailable;
- future partial changes would require a deliberate domain evolution.

## Revisit when

The product explicitly requires partial reservation, seat replacement, or partial cancellation.
