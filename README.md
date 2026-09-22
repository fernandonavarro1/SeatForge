# SeatForge

High-concurrency event reservation platform built with TypeScript and Node.js.

## Goal

SeatForge is an engineering-focused reservation platform for events with fixed, numbered seats.

The primary technical challenge is maintaining correctness under concurrent reservation attempts: two users must never be able to hold or confirm the same event seat at the same time.

The project is intentionally designed as a portfolio/interview project where architectural decisions, correctness, tests, concurrency behavior, and operational characteristics are as important as the feature set.

## Initial stack

- TypeScript
- Node.js
- NestJS
- PostgreSQL
- Prisma
- Vitest
- Testcontainers
- Docker / Docker Compose
- GitHub Actions

Additional infrastructure such as Redis, RabbitMQ, Kafka, OpenTelemetry, or separate services will only be introduced when a concrete requirement or measurement justifies it.

## Architecture

SeatForge starts as a modular monolith using a pragmatic Hexagonal Architecture / Ports and Adapters approach.

High-level flow:

HTTP
→ NestJS Controller
→ Application Use Case
→ Domain
→ Repository Port
→ Infrastructure Adapter
→ PostgreSQL

The domain must not depend on NestJS, Prisma, PostgreSQL, HTTP, or external providers.

## Core domain

Physical venue configuration:

Venue → Section → Seat

Event-specific configuration:

Event → EventSection → EventSeat
             └→ EventPrice

Reservations:

Reservation → ReservationItem → EventSeat

An Event has its own event-time configuration so later changes to a reusable Venue do not mutate an existing event's historical configuration.

## Core reservation rules

- A reservation is atomic: all requested seats are acquired or none are.
- A Reservation belongs to one User and one Event.
- A ReservationItem belongs to one Reservation and one EventSeat.
- An EventSeat can have at most one active reservation.
- HELD reservations expire after a fixed hold period.
- Expiration is evaluated during reservation/confirmation operations; the cleanup scheduler is housekeeping, not the source of truth.
- ReservationItem.unitPrice is an immutable historical price snapshot.
- Published event structure is immutable in the MVP.
- Concurrency is protected by a transactional row-locking protocol (PostgreSQL `SELECT ... FOR UPDATE`, deterministic lock order), not an in-memory mutex.

## MVP event lifecycle

DRAFT → PUBLISHED → FINISHED

No event cancellation flow is included in the initial MVP because it is not currently required.

## Development philosophy

The project intentionally avoids premature complexity.

We prefer:

- explicit requirements over technology-driven design;
- simple solutions that can be measured;
- strong database invariants;
- tests for domain and concurrency rules;
- incremental evolution;
- documented architectural decisions.

See `docs/architecture/decisions/` for the important decisions and `docs/development/roadmap.md` for the implementation sequence.
