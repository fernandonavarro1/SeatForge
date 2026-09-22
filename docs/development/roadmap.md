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
- organizer ownership checks.

Keep the auth model intentionally simple for the MVP.

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
