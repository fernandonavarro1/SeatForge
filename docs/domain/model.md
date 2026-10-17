# Domain Model

## User

Represents a platform user.

Initial roles:

- CUSTOMER
- ORGANIZER

The MVP keeps authorization simple.

## Venue

A reusable physical venue.

Fields:

- id
- name
- createdAt
- updatedAt

A Venue contains reusable physical sections and seats.

Whether `name` must be globally unique is an open decision, deferred beyond the MVP: two real venues can share a name in different cities. One option under consideration is adding a location to Venue so that name plus location identifies it.

## Section

A physical section within a Venue.

Fields:

- id
- venueId
- name
- createdAt
- updatedAt

Expected invariant:

- `name` is unique within its Venue, compared case-insensitively ("Tribuna Norte" and "tribuna norte" are the same name). Accents are significant. The name is stored trimmed, with the letter case it was entered in, for display.

Every Section is seated. Standing/general-admission areas (capacity without numbered seats) are out of scope for the MVP; see "Known limitations" in `docs/development/roadmap.md`.

## Seat

A physical numbered seat within a Section.

Fields:

- id
- sectionId
- row — non-empty text (`"A"`, `"AA"`, `"12"`), stored trimmed
- number — positive integer
- createdAt

Expected invariant:

- `(sectionId, row, number)` is unique, with `row` compared case-insensitively (row `"a"` is row `"A"`).

Seats are not modified after creation, so they carry no `updatedAt`.

## Venue configuration aggregates

On the write side, venue configuration is split into two aggregates (see `docs/architecture/decisions/ADR-006-venue-aggregates.md`):

- **Venue** holds its own name and the id and name of each of its sections. It enforces section-name uniqueness.
- **Section** holds its seats. It enforces seat-coordinate uniqueness.

Reads (listing a venue's sections or a section's seats) use dedicated queries and do not load aggregates.

Timestamps are persistence metadata set by the database. Recording *who* changed a venue's configuration requires an authenticated actor and is planned for Phase 6.

## Event

A scheduled occurrence using a Venue.

Fields:

- id
- venueId
- organizerId
- name
- startsAt
- endsAt
- status
- currency
- createdAt
- updatedAt

`currency` applies to the whole Event; every EventPrice within the Event is denominated in it.

MVP statuses:

- DRAFT
- PUBLISHED
- FINISHED

Published event structure is immutable in the MVP.

## EventSection

An event-specific section configuration.

Fields:

- id
- eventId
- sourceSectionId
- name

`sourceSectionId` identifies the physical section from which the configuration originated.

`name` belongs to the event snapshot and must not change because the source Venue changes.

## EventSeat

An event-specific seat configuration and the resource used by reservation concurrency control.

Fields:

- id
- eventId
- eventSectionId
- sourceSeatId
- row
- number

`row` and `number` are snapshot/display attributes.

`eventId` is intentionally stored even though it can be derived through EventSection. This makes the event/resource boundary explicit and simplifies queries and transactional reservation logic.

## EventPrice

A tariff offered for an EventSection.

Fields:

- id
- eventSectionId
- type
- amount

Initial tariff types:

- ADULT
- CHILD

Expected invariant:

- `(eventSectionId, type)` is unique.

Pricing belongs to the event section, not to the physical seat. Currency is not stored on EventPrice; it is inherited from the parent Event (see Event.currency).

## Reservation

An atomic acquisition of one or more EventSeats by a User for an Event.

Fields:

- id
- userId
- eventId
- status
- expiresAt
- createdAt
- updatedAt

Statuses:

- HELD
- CONFIRMED
- CANCELLED
- EXPIRED

`expiresAt` is meaningful for HELD reservations. The historical expiration timestamp may be retained after transition to EXPIRED.

## ReservationItem

A seat acquired as part of a Reservation.

Fields:

- id
- reservationId
- eventSeatId
- eventPriceId
- unitPrice
- currency
- createdAt

`unitPrice` is a historical snapshot and must not change if EventPrice is later changed. `currency` is a historical snapshot of the Event's currency at reservation time.

## Relationships

Venue
→ Section
→ Seat

Event
→ EventSection
→ EventSeat
→ source Seat

EventSection
→ EventPrice

User
→ Reservation
→ ReservationItem
→ EventSeat

Reservation also stores `eventId` directly as an intentional denormalization.

## Structural immutability

Venue configuration may evolve.

Published Event configuration must not be structurally modified in the MVP.

This prevents changes such as moving an already-reserved seat between sections or changing the event-time identity of a seat after reservations exist.
