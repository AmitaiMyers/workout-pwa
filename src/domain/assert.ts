/** Fail fast on broken assumptions instead of silently continuing with bad data. */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/** Return the value or throw if it is missing. */
export function required<T>(value: T | undefined | null, message: string): T {
  assert(value !== undefined && value !== null, message);
  return value;
}

export function newId(): string {
  return crypto.randomUUID();
}
