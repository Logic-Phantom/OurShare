export type DomainErrorCode =
  | 'INVALID_DATE'
  | 'INVALID_SHARES'
  | 'INVALID_TRANSITION';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
