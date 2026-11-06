// Runs the real migration on PGlite (Postgres in WebAssembly) with a small stand-in for Supabase's
// auth schema and roles, so RLS and function grants are exercised exactly as written.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { PGlite } from '@electric-sql/pglite';

const ROOT = resolve(import.meta.dirname, '..', '..');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

const SUPABASE_STANDIN = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, is_anonymous boolean not null default true, created_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;

// Supabase grants table privileges to anon/authenticated by default and relies on RLS; mirror that.
const SUPABASE_DEFAULT_GRANTS = `grant all on all tables in schema public to anon, authenticated;`;

export async function createServer() {
  const db = new PGlite();
  await db.exec(SUPABASE_STANDIN);
  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  await db.exec(SUPABASE_DEFAULT_GRANTS);
  return db;
}

let next = 0;
export function uuid(prefix = '0') {
  next += 1;
  // The prefix only makes ids easier to tell apart in failures; it is turned into hex so the uuid stays valid.
  return `${prefix.charCodeAt(0).toString(16).padStart(8, '0')}-0000-4000-8000-${String(next).padStart(12, '0')}`;
}

/** Creates an anonymous user and returns helpers that run SQL as that user. */
export async function signIn(db) {
  const id = uuid('a');
  await db.query('insert into auth.users (id) values ($1)', [id]);
  const as = async (sql, params = []) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`);
    try {
      return await db.query(sql, params);
    } finally {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
    }
  };
  const rpc = async (fn, args) => {
    const names = Object.keys(args);
    const sql = `select public.${fn}(${names.map((name, index) => `${name} => $${index + 1}`).join(', ')}) as result`;
    const { rows } = await as(sql, names.map((name) => args[name]));
    return rows[0]?.result;
  };
  return { id, as, rpc };
}

export const now = () => new Date().toISOString();

export function householdRow(id, overrides = {}) {
  return { id, name: '우리집', week_starts_on: 1, metric: 'POINTS', share_preset: 'EQUAL', mode: 'LOCAL', created_at: now(), updated_at: now(), deleted_at: null, ...overrides };
}

export function memberRow(householdId, overrides = {}) {
  return {
    id: uuid('b'),
    household_id: householdId,
    display_name: '지민',
    color_key: 'blue',
    avatar_key: 'short',
    target_share_percent: 50,
    is_active: 1,
    sort_order: 0,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
    ...overrides,
  };
}

export function weekPlanRow(householdId, overrides = {}) {
  return { id: uuid('c'), household_id: householdId, week_start_date: '2026-11-09', metric: 'POINTS', seed: 's', algorithm_version: 1, confirmed_at: now(), created_at: now(), updated_at: now(), deleted_at: null, ...overrides };
}

/** 26 characters of Crockford Base32, as the app generates. */
export function inviteCode(seed = 'A') {
  return seed.repeat(26).slice(0, 26);
}
