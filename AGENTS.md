# SeatForge Agent Guidelines

## Project context

SeatForge is a high-concurrency event reservation platform built with TypeScript and Node.js.

The project is designed to demonstrate production-oriented backend engineering, especially domain modeling, PostgreSQL transactions, concurrency control, testing, and observability.

## Before making changes

Read the relevant project documentation before implementing a feature:

- `README.md`
- `docs/architecture/overview.md`
- `docs/domain/model.md`
- `docs/domain/invariants.md`
- relevant ADRs under `docs/architecture/decisions/`
- `docs/development/roadmap.md`

Inspect the existing code before proposing structural changes.

## Architecture rules

- Start as a modular monolith.
- Use pragmatic Hexagonal Architecture / Ports and Adapters.
- Keep domain logic independent from NestJS and infrastructure frameworks.
- Do not import Prisma, PostgreSQL clients, HTTP objects, or external providers into the domain layer.
- Infrastructure adapters implement ports defined by the application/domain boundaries.
- Do not introduce microservices without an explicit requirement and architectural decision.

## Domain rules

- Reservations are atomic.
- A reservation contains one or more EventSeats from the same Event.
- An EventSeat can have at most one active reservation.
- HELD reservations have an expiration time.
- An expired HELD reservation must not prevent a new reservation.
- Expiration cleanup is housekeeping; availability correctness must not depend on the scheduler.
- Published event seat/section structure is immutable in the MVP.
- ReservationItem.unitPrice is an immutable historical snapshot.
- EventPrice belongs to an EventSection and is identified by tariff type within that section.
- `Reservation.eventId` is intentionally stored even though it is derivable from its items.
- `EventSeat.eventId` is intentionally stored to make the event/resource boundary explicit and simplify reservation operations.

## Concurrency rules

Reservation acquisition must:

1. execute in a database transaction;
2. lock requested EventSeats with row-level locking;
3. acquire locks in deterministic order;
4. inspect active reservations;
5. expire stale HELD reservations when appropriate;
6. create the Reservation and all ReservationItems atomically;
7. commit only if every requested seat can be acquired.

Database constraints must provide a final integrity guarantee in addition to application logic.

Do not replace concurrency guarantees with an in-memory mutex. The application may run with multiple Node.js processes/instances.

## Testing rules

Every domain invariant should have tests.

Concurrency behavior must be tested against real PostgreSQL, preferably through Testcontainers, rather than relying only on mocks or an in-memory database.

Do not consider a feature complete merely because unit tests pass. Add integration/concurrency tests where the behavior depends on PostgreSQL transactions, locks, constraints, or isolation.

## Engineering principles

- Do not introduce Redis, Kafka, RabbitMQ, Elasticsearch, Kubernetes, or other infrastructure unless a concrete requirement or measurement justifies it.
- Avoid speculative abstractions.
- Avoid excessive file/module fragmentation.
- Prefer explicit names over clever abstractions.
- Keep functions and modules cohesive.
- Preserve existing architectural decisions unless a change is explicitly discussed and documented.
- When a proposed change contradicts an ADR or invariant, stop and explain the conflict before implementing it.
- When requirements are ambiguous, ask for clarification rather than inventing business behavior.
- Do not silently broaden MVP scope.

## Working with the human developer

For non-trivial tasks:

1. summarize the relevant context;
2. propose a short implementation plan;
3. identify architectural/domain decisions that need confirmation;
4. implement only after the plan is accepted;
5. run appropriate tests;
6. report what changed, what was tested, and any remaining risks.

Do not generate the entire application from a high-level request without first establishing the relevant design and acceptance criteria.

## Git and commits

* Branch names must follow this convention:

  * `feature/<task-id>-<short-description>`
  * `fix/<task-id>-<short-description>`
  * `refactor/<task-id>-<short-description>`
  * `test/<task-id>-<short-description>`
  * `docs/<task-id>-<short-description>`
  * When no task ID exists, omit it: `feature/reservation-create`.
* Task IDs are optional for now. If used, SeatForge IDs follow the format `SF-<number>` (for example, `SF-004`).
* Commit messages must start with a Gitmoji from https://gitmoji.dev.
* Commit format:

  * With task ID: `<gitmoji> SF-<number>: <description>`
  * Without task ID: `<gitmoji> <description>`
* Prefer Gitmoji that accurately represents the change. Examples:

  * `✨` new functionality
  * `🐛` bug fix
  * `🧪` tests
  * `♻️` refactoring
  * `📝` documentation
  * `🔧` configuration/tooling
  * `⚡` performance
  * `🏗️` architectural/infrastructure work
  * `👷` CI/build automation
* Keep commits focused on one coherent conceptual change.
* Include relevant tests in the same commit as the implementation.
* Database migrations must be committed together with the application changes that require them, unless there is a deliberate reason to separate them.
* Do not mix unrelated formatting, refactoring, or cleanup with a feature or bug fix.
* Do not commit known-broken code unless explicitly requested.
* Commit messages should describe the intent of the change, not low-level implementation details.
* Keep the final history clean. Temporary local commits may be amended or squashed before merging.
* Claude Code must not create commits unless explicitly instructed by the human developer.
* Before committing, run the relevant formatter, linter, type checks, and tests.
* Never commit secrets, credentials, local environment files, or generated artifacts that are not intended to be versioned.
