/**
 * Text rules shared by the Venue and Section aggregates.
 *
 * Values are stored trimmed but with their original letter case, for display.
 * Uniqueness compares the case-insensitive key; accents remain significant.
 * The database mirrors this with `citext` columns and CHECK constraints.
 */
export function trimmed(value: string): string {
  return value.trim();
}

export function comparisonKey(value: string): string {
  return value.trim().toLowerCase();
}
