# Development Roadmap

The project is intentionally implemented incrementally.

The human developer owns requirements and architectural decisions. Claude Code acts as an implementation partner.

## Phase 0 — Bootstrap

Goal:

- initialize the NestJS/TypeScript project;
- configure package management;
- linting/formatting;
- Vitest;
- Docker/Docker Compose;
- PostgreSQL;
- Prisma;
- basic CI.

Acceptance:

- project starts locally;
- PostgreSQL is available;
- a minimal test passes;
- CI runs the same baseline checks.

Claude Code request: inspect repository, propose bootstrap plan, then implement after approval.

## Phase 1 — Domain foundation

Implement:

- Venue
- Section
- Seat

Focus:

- domain boundaries;
- repository ports;
- Prisma adapter;
- migrations;
- basic integration tests.

Do not implement reservations yet.

## Phase 2 — Event configuration

Implement:

- Event
- EventSection
- EventSeat
- EventPrice

Focus:

- event configuration snapshot;
- publication lifecycle;
- structural immutability;
- pricing invariants.

## Phase 3 — Reservation baseline

Implement:

- Reservation
- ReservationItem
- HELD / CONFIRMED / CANCELLED / EXPIRED state transitions;
- expiration semantics;
- atomic multi-seat reservation.

First implement the use case and tests without attempting to optimize prematurely.

## Phase 4 — PostgreSQL concurrency

Implement and test:

- row-level locking;
- deterministic lock ordering;
- active-reservation exclusivity via the transactional locking protocol (see ADR-004; no database uniqueness backstop for the MVP);
- expired HELD handling;
- deadlock/serialization-failure retry behavior;
- concurrent reservation integration tests against real PostgreSQL.

This is the core technical phase.

## Phase 5 — Idempotency

Implement:

- Idempotency-Key for reservation creation;
- database-backed idempotency state;
- safe retry behavior;
- tests for lost-response/retry scenarios.

## Phase 6 — Authentication and authorization

Implement:

- registration/login;
- authentication;
- CUSTOMER vs ORGANIZER authorization;
- organizer ownership checks;
- audit trail of organizer/administrator configuration changes (who, what, when), recorded in the backend.

Keep the auth model intentionally simple for the MVP.

The audit trail is a requirement for the backoffice: it must be possible to tell, for example, which employee changed a venue's sections or seats. It belongs to the backend because frontend logs are not reliable evidence. It is deferred to this phase because it needs an authenticated actor; Phase 1 only records timestamps.

## Phase 7 — HTTP API completion

Expose and test:

- authentication endpoints;
- event endpoints;
- seat availability;
- reservation endpoints.

Add API-level integration tests.

## Phase 8 — Load and contention testing

Introduce realistic concurrent workloads.

Measure:

- successful reservation rate;
- conflict rate;
- latency;
- transaction failures;
- database contention;
- throughput.

Use measurements to identify actual bottlenecks.

## Phase 9 — Observability

Only after the transactional behavior is stable:

- structured logging;
- useful metrics;
- tracing/OpenTelemetry if justified.

Observability should help diagnose real behavior rather than exist as ceremony.

## Phase 10 — Frontend

Build the Next.js frontend after the backend contract and core concurrency behavior are stable.

The UI is not the primary engineering challenge of this project.

## Known limitations and open decisions

Deliberately outside the MVP, recorded so they are decided rather than forgotten:

- **Standing / general-admission areas.** Every Section has numbered seats. A standing area (for example a concert floor) would be reserved by capacity, not by seat, which needs a capacity model and a different concurrency strategy (a contended counter rather than per-seat row locks) and would change ReservationItem. It requires its own ADR.
- **Global uniqueness of `Venue.name`.** Undecided. Two real venues can share a name in different cities; one option is adding a location to Venue so that name plus location is unique.

## Possible future evolution

Only if requirements or measurements justify it:

- Redis;
- asynchronous messaging;
- background workers;
- payment provider;
- notifications;
- search;
- service extraction;
- Kubernetes.

Each significant addition should have a documented reason and, where appropriate, an ADR.
