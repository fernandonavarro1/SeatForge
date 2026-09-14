# ADR-005: Store Historical Reservation Price

- Status: Accepted
- Date: 2026-09-14

## Context

EventPrice represents the currently configured tariff for an EventSection.

Prices may change after a reservation is created.

Historical reservations must retain the price that was actually acquired.

## Decision

ReservationItem stores:

- eventPriceId;
- unitPrice;
- currency.

`unitPrice` and `currency` are immutable historical snapshots.

## Rationale

`eventPriceId` tells us which configured tariff was selected.

`unitPrice` tells us the actual historical value at reservation time.

Keeping both allows pricing configuration to evolve without rewriting historical reservation data.

## Consequences

Positive:

- reliable historical records;
- easier reporting;
- later price changes do not alter existing reservations.

Negative:

- intentional data duplication;
- application/database rules must prevent mutation of historical unit price.

## Revisit when

Pricing becomes substantially more complex, for example with promotions, effective dates, taxes, fees, or multiple currencies.
