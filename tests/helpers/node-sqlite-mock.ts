// Runs the app's real SQL against a real SQLite engine (Node's built-in) instead of faking query results.
// Only the small part of the expo-sqlite API the app uses is implemented.
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

class FakeDatabase {
  private readonly db = new DatabaseSync(':memory:');

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: SQLInputValue[]): Promise<{ changes: number }> {
    const result = this.db.prepare(sql).run(...params);
    return { changes: Number(result.changes) };
  }

  async getFirstAsync<T>(sql: string, ...params: SQLInputValue[]): Promise<T | null> {
    return (this.db.prepare(sql).get(...params) as T | undefined) ?? null;
  }

  async getAllAsync<T>(sql: string, ...params: SQLInputValue[]): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

export const openDatabaseAsync = async () => new FakeDatabase();
