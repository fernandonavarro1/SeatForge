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

A Venue contains reusable physical sections and seats.

## Section

A physical section within a Venue.

Fields:

- id
- venueId
- name

## Seat

A physical numbered seat within a Section.

Fields:

- id
- sectionId
- row
- number

Expected invariant:

- `(sectionId, row, number)` is unique.

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
