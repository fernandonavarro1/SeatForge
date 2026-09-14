# ADR-001: Modular Monolith

- Status: Accepted
- Date: 2026-09-14

## Context

SeatForge is an MVP for high-concurrency event reservations.

The system has a strong transactional boundary around reservation acquisition and currently has no demonstrated requirement for independently deployed services.

## Decision

Start with a modular monolith using pragmatic Hexagonal Architecture / Ports and Adapters.

Modules should have explicit boundaries even though they are deployed as one application.

## Rationale

A modular monolith gives us:

- simple deployment;
- straightforward local transactions;
- a single PostgreSQL transactional boundary;
- low operational complexity;
- clear internal boundaries;
- an easier path to extract services later if a real need appears.

Microservices are deliberately deferred because there is no current requirement that justifies their additional operational and distributed-systems complexity.

## Consequences

Positive:

- fast development;
- easier debugging;
- simpler transactional behavior;
- architecture still encourages separation of concerns.

Negative:

- some boundaries are enforced by convention/code structure rather than network isolation;
- the application can become coupled if module boundaries are not maintained.

## Revisit when

Consider service extraction only if measurements or requirements demonstrate a need for:

- independent scaling;
- independent deployment;
- fault isolation;
- separate ownership;
- materially different runtime characteristics.
