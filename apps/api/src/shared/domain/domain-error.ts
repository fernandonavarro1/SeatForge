/**
 * Base class for business-rule violations.
 *
 * `code` is a stable, machine-readable identifier so delivery layers (HTTP in
 * Phase 7) can translate errors without matching on message text.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
