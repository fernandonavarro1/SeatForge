# ADR-006: Venue Configuration Aggregates

- Status: Accepted
- Date: 2026-10-17

## Context

Venue configuration (Venue → Section → Seat) has two uniqueness rules:

- a Section's name is unique within its Venue;
- a Seat's `(row, number)` is unique within its Section.

Venues can be large: a stadium may have around 100,000 seats.

Configuration writes (an organizer adding a section or a block of seats) are rare compared to reservation traffic, but they should not have to load an entire venue.

Customers never read a Venue directly. They browse an Event's own snapshot (EventSection/EventSeat, see ADR-002).

## Decision

Split the write side into two aggregates, each sized to the smallest boundary that contains one of the rules:

- **Venue** holds its name and the id and name of each of its sections, never seats. It enforces section-name uniqueness, which spans sections.
- **Section** holds its seats. It enforces seat-coordinate uniqueness, which only spans the seats of one section.

A section's name belongs to Venue, its seats to Section. Adding seats loads only the target section.

Both aggregates are saved through a module-local unit of work (`VenueUnitOfWork`). A use case that touches both, such as creating a venue with its layout, commits in one transaction.

Reads go through a separate `VenueQueries` port that projects exactly what is asked (a venue with section seat counts, or one section's seats), without loading aggregates.

Configuration writes take no row locks. Each uniqueness rule is also a database unique index. When two concurrent transactions both pass the in-memory check, the index rejects the second and the adapter maps the violation to the same domain error.

## Rationale

A single Venue aggregate holding every seat protects no additional rule: no invariant relates seats in different sections. It would only make every configuration write load the whole venue.

A repository per entity (Venue, Section, Seat) would leave the rules without an owner in the domain. They would live only in database constraints or in check-then-insert application code.

## Consequences

Positive:

- writes stay proportional to one section, even for very large venues;
- both rules are tested as domain behaviour, without a database;
- the database remains the final guarantee under concurrency.

Negative:

- one more repository and port than a single aggregate;
- the section row is written by two repositories (its name by Venue, its seats by Section), which must be saved in that order when a section is new.

## Revisit when

- a rule appears that spans seats of different sections;
- a single section grows large enough that loading its seats becomes measurably slow.
