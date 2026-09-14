# Architecture Overview

## Architectural style

SeatForge starts as a **modular monolith** with a pragmatic **Hexagonal Architecture / Ports and Adapters** approach.

The goal is to keep domain and application logic independent from delivery mechanisms and infrastructure while avoiding unnecessary ceremony.

## Why a modular monolith?

The MVP has:

- one product;
- one primary transactional database;
- no demonstrated need for independent service deployment;
- strong transactional requirements around reservation acquisition.

A modular monolith keeps local transactions and development simple while allowing boundaries to remain explicit.

Microservices may be considered later only if measurements or requirements demonstrate a need for independent scaling, deployment, ownership, or fault isolation.

## Layering

Conceptually:

HTTP / delivery
→ Application
→ Domain
→ Ports
→ Infrastructure adapters

### Domain

Contains business concepts and rules.

It must not depend on:

- NestJS
- Prisma
- PostgreSQL
- HTTP
- JWT implementation details
- external payment providers
- Redis
- message brokers

### Application

Coordinates use cases and transactions.

Examples:

- CreateEvent
- PublishEvent
- CreateReservation
- ConfirmReservation
- CancelReservation
- GetReservation

The application layer depends on ports rather than concrete infrastructure.

### Infrastructure

Contains concrete adapters:

- Prisma repositories
- PostgreSQL persistence
- authentication adapters
- schedulers
- external providers, if introduced later

### Delivery

NestJS controllers and related HTTP concerns translate requests into application commands/queries and application results into HTTP responses.

## Reservation transaction boundary

The reservation acquisition is one database transaction.

Conceptually:

BEGIN
→ validate event and requested EventSeats
→ lock EventSeats in deterministic order
→ inspect active reservations
→ expire stale HELD reservations when applicable
→ verify every requested seat is available
→ create Reservation
→ create all ReservationItems
→ COMMIT

Any failure rolls back the entire acquisition.

## Database as a correctness boundary

The application should not rely solely on a prior `SELECT` followed by an `INSERT`.

PostgreSQL constraints and transaction semantics are part of the correctness design.

The database should enforce the strongest invariants that can be expressed there, while application/domain logic handles business behavior.

## Snapshot model

A Venue is reusable configuration.

An Event gets an event-specific snapshot:

Venue
→ Section
→ Seat

Event
→ EventSection
→ EventSeat
→ EventPrice

The event-specific configuration protects published/historical events from later changes to the reusable venue.

## Explicitly deferred infrastructure

The initial architecture does not include:

- Redis
- Kafka
- RabbitMQ
- Elasticsearch
- Kubernetes
- microservices

These are not considered architectural failures. They are deliberately deferred until a concrete requirement or measured bottleneck justifies them.
