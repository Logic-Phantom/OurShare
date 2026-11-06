import type { PullPayload, PushChange, PushResult, Remote, ServerRow } from '@/features/sync/remote';
import { RemoteError } from '@/features/sync/remote';
import { rowKey, SYNC_TABLES, type SyncTable } from '@/features/sync/sync-tables';

/**
 * An in-memory server with the same rules as supabase/migrations (version check, duplicate weeks,
 * household scoping). The SQL itself is tested separately on PGlite (tests/server).
 */
export class FakeServer {
  rows = new Map<string, ServerRow>();
  members = new Map<string, Set<string>>();
  invites = new Map<string, string>();
  private clock = 0;
  online = true;

  private tick(): string {
    this.clock += 1;
    return new Date(Date.UTC(2026, 10, 6, 0, 0, this.clock)).toISOString();
  }

  remoteFor(userId: string): Remote {
    const server = this;
    const guard = (householdId: string) => {
      if (!server.online) throw new RemoteError('network');
      if (!server.members.get(householdId)?.has(userId)) throw new RemoteError('not_a_member');
    };
    return {
      async ensureSession() {
        if (!server.online) throw new RemoteError('network');
      },
      async createHousehold(household) {
        const id = String(household.id);
        server.rows.set(`household:${id}`, { ...household, mode: 'SHARED', version: 1, server_updated_at: server.tick() });
        server.members.set(id, new Set([userId]));
      },
      async createInvite(householdId, code) {
        guard(householdId);
        server.invites.set(code, householdId);
        return '2026-11-13T00:00:00.000Z';
      },
      async joinHousehold(code) {
        const householdId = server.invites.get(code);
        if (!householdId) return null;
        server.members.get(householdId)?.add(userId);
        return householdId;
      },
      async push(householdId, changes: PushChange[]): Promise<PushResult[]> {
        guard(householdId);
        return changes.map((change) => {
          const key = `${change.table}:${rowKey(change.table, change.row)}`;
          const existing = server.rows.get(key);
          if (existing && change.table !== 'household' && existing.household_id !== householdId) throw new Error('wrong_household');
          if (existing && Number(existing.version) !== change.base_version) return { table: change.table, row: existing, status: 'conflict' };
          if (change.table === 'week_plan') {
            const clash = [...server.rows.entries()].find(
              ([otherKey, row]) => otherKey.startsWith('week_plan:') && otherKey !== key && row.household_id === householdId && row.week_start_date === change.row.week_start_date,
            );
            if (clash) return { table: change.table, row: change.row, status: 'duplicate' };
          }
          const row: ServerRow = {
            ...change.row,
            ...(change.table === 'household' ? { mode: 'SHARED' } : { household_id: householdId }),
            version: Number(existing?.version ?? 0) + 1,
            server_updated_at: server.tick(),
          };
          server.rows.set(key, row);
          return { table: change.table, row, status: 'ok' };
        });
      },
      async pull(householdId, since): Promise<PullPayload> {
        guard(householdId);
        const payload = { server_time: server.tick(), member_count: server.members.get(householdId)?.size ?? 0 } as PullPayload;
        for (const table of SYNC_TABLES) payload[table] = [];
        for (const [key, row] of server.rows) {
          const table = key.split(':')[0] as SyncTable;
          const mine = table === 'household' ? row.id === householdId : row.household_id === householdId;
          if (mine && (!since || String(row.server_updated_at) > since)) payload[table].push(row);
        }
        return payload;
      },
      async leave(householdId) {
        server.members.get(householdId)?.delete(userId);
      },
      async deleteAccount() {
        for (const set of server.members.values()) set.delete(userId);
      },
    };
  }
}
