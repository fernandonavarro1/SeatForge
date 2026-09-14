# Git Workflow

## Purpose

SeatForge uses Git as part of the engineering workflow, not only as a mechanism for storing code.

The Git history should make it possible to understand the evolution of the system and the reasoning behind meaningful changes.

The workflow is intentionally lightweight. SeatForge is a personal project with a single developer, so we do not introduce project-management tooling unless it provides clear value.

## Task IDs

Task IDs are optional.

For now, SeatForge does not require Jira, Linear, or another external project-management tool.

When task tracking is useful, use a simple SeatForge identifier:

```text
SF-001
SF-002
SF-003
...
```

These IDs may later be associated with GitHub Issues or another task-management system without changing the Git workflow.

A task list may live in:

```text
docs/development/tasks.md
```

## Branch naming

Branches should describe the type of work and the task when one exists.

With a task ID:

```text
feature/SF-004-atomic-reservation
fix/SF-012-expired-hold
test/SF-015-reservation-concurrency
refactor/SF-018-reservation-domain
docs/SF-020-concurrency-adr
```

Without a task ID:

```text
feature/reservation-create
fix/expired-hold
test/reservation-concurrency
docs/git-workflow
```

Use short, descriptive names in kebab-case.

## Commit messages

Commits use Gitmoji.

With a task ID:

```text
✨ SF-004: implement atomic reservation
```

Without a task ID:

```text
✨ implement atomic reservation
```

The description should explain the meaningful intent of the commit rather than implementation details.

### Common Gitmoji

| Gitmoji | Meaning                     |
| ------- | --------------------------- |
| ✨       | New functionality           |
| 🐛      | Bug fix                     |
| 🧪      | Tests                       |
| ♻️      | Refactoring                 |
| 📝      | Documentation               |
| 🔧      | Configuration/tooling       |
| ⚡       | Performance                 |
| 🏗️     | Architecture/infrastructure |
| 👷      | CI/build automation         |

These are conventions, not an exhaustive list. Use another Gitmoji when it communicates the change more accurately.

## Commit granularity

A commit should represent **one coherent conceptual change**.

Good:

```text
✨ SF-004: implement atomic reservation
🧪 SF-004: add concurrent reservation tests
```

Less desirable:

```text
✨ SF-004: implement reservation, refactor events, update README and fix linting
```

Avoid unrelated cleanup in feature commits.

Relevant tests belong in the same commit as the implementation when practical. If the test work is substantial enough to represent an independent conceptual change, it may be a separate commit.

Database migrations should normally be committed together with the application changes that depend on them. This keeps the repository history understandable and makes it easier to reason about which code expects which schema.

## Commit quality

Before creating a commit, the developer should run the checks relevant to the change:

1. Formatter
2. Linter
3. Type checking
4. Relevant unit/integration tests
5. Full test suite when appropriate

Known-broken code should not be committed unless there is an explicit reason to do so.

Temporary local commits are acceptable while developing. Before merging, the history should be cleaned up when necessary through amend/squash.

## Claude Code and commits

Claude Code is an implementation agent, not the owner of the repository history.

Claude Code must **not create commits automatically**.

The human developer decides when a change is complete and explicitly asks Claude Code to create a commit if desired.

Before that point, Claude Code should report:

* What changed
* Why it changed
* Tests/checks executed
* Any migration introduced
* Any architectural or domain decision affected
* Any known limitations or follow-up work

The final commit is therefore a deliberate engineering decision rather than an automatic consequence of an AI agent finishing a task.
