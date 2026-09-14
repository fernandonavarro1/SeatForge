# Claude Code Workflow

## Purpose

Claude Code is the implementation partner, not the owner of product or architecture decisions.

The human developer owns:

- requirements;
- domain rules;
- architectural decisions;
- trade-offs;
- acceptance criteria;
- final review.

Claude Code owns:

- repository inspection;
- implementation;
- repetitive code;
- test scaffolding;
- refactoring;
- local verification;
- reporting implementation results.

## Standard workflow

### 1. Context

Before a non-trivial task, Claude Code should read:

- `AGENTS.md`;
- relevant domain documentation;
- relevant ADRs;
- existing code in the affected module.

### 2. Plan

Claude Code should propose:

- files/modules to change;
- implementation approach;
- tests to add;
- risks or ambiguities.

Do not implement a substantial feature before the plan is reviewed.

### 3. Implementation

Implement the smallest coherent change that satisfies the accepted plan.

Do not introduce unrelated abstractions or infrastructure.

### 4. Verification

Run:

- formatter/linter;
- unit tests;
- integration tests where relevant;
- migration/schema checks;
- concurrency tests when database behavior is involved.

### 5. Review

Report:

- what changed;
- tests executed;
- relevant design decisions;
- known limitations;
- follow-up work.

## Prompt structure

A good task prompt should normally contain:

### Context

Point Claude Code to the relevant documentation.

### Task

State one concrete feature or engineering change.

### Constraints

State architectural/domain rules that must not be violated.

### Acceptance criteria

Describe observable behavior.

### Tests

Specify which behaviors need verification.

### Do not

Explicitly exclude unrelated work.

## Example

```text
Read AGENTS.md, docs/domain/model.md,
docs/domain/invariants.md and the relevant ADRs.

Task:
Implement the Venue domain and persistence foundation.

Requirements:
- Venue has Sections.
- Section belongs to exactly one Venue.
- Seat belongs to exactly one Section.
- (sectionId, row, number) must be unique.
- Keep domain code independent from Prisma/NestJS.

Acceptance criteria:
- migrations work against PostgreSQL;
- repository operations are covered by integration tests;
- domain invariants have tests;
- existing architecture rules are respected.

Do not:
- implement Events;
- implement Reservations;
- add Redis;
- add microservices;
- introduce abstractions unrelated to this task.

First propose the implementation plan. Do not modify files until the plan is approved.
```

## When to create or update an ADR

Create/update an ADR when a change:

- introduces infrastructure;
- changes architectural boundaries;
- changes a core concurrency strategy;
- changes a major domain invariant;
- intentionally accepts a significant trade-off.

Do not create an ADR for routine implementation details.

## Important rule

If implementation reveals that an existing decision is technically unsound, do not silently work around it.

Stop, explain:

1. the discovered problem;
2. why the current decision is insufficient;
3. possible alternatives;
4. the recommended change.

Then update the relevant documentation after the decision is made.
