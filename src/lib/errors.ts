/**
 * Turn an unknown thrown value into a human-readable, single-string message.
 *
 * `catch` binds `unknown`, so failures can be `Error`s, strings, or arbitrary
 * objects (e.g. a rejected Tauri `invoke`). This normalizes them into something
 * worth putting in front of a user in an error dialog.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error === null || error === undefined) {
    return 'Unknown error';
  }
  try {
    return JSON.stringify(error);
  } catch {
    // Non-serializable value (e.g. a circular object); fall back to its type.
    return `Unserializable error (${typeof error})`;
  }
}
