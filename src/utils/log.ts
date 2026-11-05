/** Only the place and the error type are logged: messages can quote names or chore text. */
export function logError(scope: string, error: unknown): void {
  console.warn(`[${scope}]`, error instanceof Error ? error.name : 'unknown error');
}
