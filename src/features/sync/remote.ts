import type { SyncTable } from './sync-tables';

export type ServerRow = Record<string, string | number | null>;

export interface PushChange {
  table: SyncTable;
  row: ServerRow;
  /** The server version this device last saw; 0 for a row created here. */
  base_version: number;
}

export interface PushResult {
  table: SyncTable;
  row: ServerRow;
  status: 'ok' | 'conflict' | 'duplicate';
}

export type PullPayload = { server_time: string; member_count: number } & Record<SyncTable, ServerRow[]>;

/** The server, as the sync engine sees it. Implemented by Supabase RPCs in production and by a fake in tests. */
export interface Remote {
  ensureSession(): Promise<void>;
  createHousehold(household: ServerRow): Promise<void>;
  createInvite(householdId: string, code: string): Promise<string>;
  /** null when the code is wrong, expired or used up. */
  joinHousehold(code: string): Promise<string | null>;
  push(householdId: string, changes: PushChange[]): Promise<PushResult[]>;
  pull(householdId: string, since: string | null): Promise<PullPayload>;
  leave(householdId: string): Promise<void>;
  deleteAccount(): Promise<void>;
}

/** Server errors the app explains to the user. Everything else is shown as a connection problem. */
export type RemoteErrorCode = 'not_a_member' | 'too_many_attempts' | 'household_full' | 'too_many_households' | 'too_many_invites' | 'not_configured' | 'network';

export class RemoteError extends Error {
  constructor(readonly code: RemoteErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RemoteError';
  }
}

const KNOWN: RemoteErrorCode[] = ['not_a_member', 'too_many_attempts', 'household_full', 'too_many_households', 'too_many_invites'];

export function toRemoteError(message: string | undefined): RemoteError {
  const code = KNOWN.find((candidate) => message?.includes(candidate));
  return new RemoteError(code ?? 'network', message);
}
