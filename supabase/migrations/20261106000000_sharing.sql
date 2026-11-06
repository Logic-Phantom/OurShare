-- 우리몫 sharing schema. Design: docs/SHARING.md.
-- Apply in the Supabase SQL editor (or `supabase db push`). Tested locally by tests/server/*.test.ts on PGlite.
--
-- Rules
--   * Every table has RLS. Members of a household can read its rows. Nobody writes tables directly:
--     all writes go through the security-definer RPCs below, which check membership themselves.
--   * Tables mirror the app's SQLite tables (src/features/backup/backup-format.ts lists the columns),
--     plus server-owned columns: household_id where the app lacks it, version, server_updated_at, updated_by.
--   * The app ships only the publishable key. Never put the service_role key in the app.

-- ---------------------------------------------------------------------------
-- Households and membership
-- ---------------------------------------------------------------------------
create table if not exists public.household (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 40),
  week_starts_on int not null check (week_starts_on in (0, 1)),
  metric text not null check (metric in ('POINTS', 'TASK_COUNT')),
  share_preset text not null check (share_preset in ('EQUAL', 'CUSTOM')),
  mode text not null default 'SHARED' check (mode in ('LOCAL', 'SHARED')),
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  version int not null default 1,
  server_updated_at timestamptz not null default now(),
  updated_by uuid,
  last_active_at timestamptz not null default now()
);

create table if not exists public.household_membership (
  household_id uuid not null references public.household(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER', 'MEMBER')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists household_membership_user on public.household_membership(user_id);

create table if not exists public.household_invite (
  token_hash bytea primary key,
  household_id uuid not null references public.household(id) on delete cascade,
  created_by uuid,
  expires_at timestamptz not null,
  max_uses int not null default 5 check (max_uses between 1 and 20),
  uses int not null default 0
);

create table if not exists public.join_attempt (
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);
create index if not exists join_attempt_user on public.join_attempt(user_id, attempted_at);

-- ---------------------------------------------------------------------------
-- Shared data (same columns as the app)
-- ---------------------------------------------------------------------------
create table if not exists public.member (
  id uuid primary key,
  household_id uuid not null references public.household(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  color_key text not null check (char_length(color_key) <= 20),
  avatar_key text not null check (char_length(avatar_key) <= 20),
  target_share_percent int not null check (target_share_percent between 0 and 100),
  is_active int not null check (is_active in (0, 1)),
  sort_order int not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  version int not null default 1,
  server_updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.chore_definition (
  id uuid primary key,
  household_id uuid not null references public.household(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  category text not null check (char_length(category) <= 20),
  weekdays_mask int not null check (weekdays_mask between 1 and 127),
  due_time text check (due_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  assignment_mode text not null check (assignment_mode in ('FIXED', 'AUTO_BALANCED_RANDOM', 'MANUAL')),
  fixed_member_id uuid,
  workload_points int not null check (workload_points between 1 and 5),
  estimated_minutes int check (estimated_minutes between 1 and 600),
  reminder_mode text not null check (reminder_mode in ('NONE', 'SAME_DAY', 'DAY_BEFORE')),
  notes text check (char_length(notes) <= 200),
  is_active int not null check (is_active in (0, 1)),
  sort_order int not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  version int not null default 1,
  server_updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.week_plan (
  id uuid primary key,
  household_id uuid not null references public.household(id) on delete cascade,
  week_start_date text not null check (week_start_date ~ '^\d{4}-\d{2}-\d{2}$'),
  metric text not null check (metric in ('POINTS', 'TASK_COUNT')),
  seed text not null check (char_length(seed) <= 64),
  algorithm_version int not null,
  confirmed_at text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  version int not null default 1,
  server_updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (household_id, week_start_date)
);

create table if not exists public.week_plan_target (
  week_plan_id uuid not null references public.week_plan(id) on delete cascade,
  member_id uuid not null,
  target_share_percent int not null check (target_share_percent between 0 and 100),
  household_id uuid not null references public.household(id) on delete cascade,
  version int not null default 1,
  server_updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (week_plan_id, member_id)
);

create table if not exists public.scheduled_chore (
  id uuid primary key,
  household_id uuid not null references public.household(id) on delete cascade,
  week_plan_id uuid not null references public.week_plan(id) on delete cascade,
  chore_definition_id uuid,
  local_date text not null check (local_date ~ '^\d{4}-\d{2}-\d{2}$'),
  original_local_date text not null check (original_local_date ~ '^\d{4}-\d{2}-\d{2}$'),
  title_snapshot text not null check (char_length(title_snapshot) between 1 and 40),
  category_snapshot text not null check (char_length(category_snapshot) <= 20),
  workload_points_snapshot int not null check (workload_points_snapshot between 1 and 5),
  estimated_minutes_snapshot int,
  due_time_snapshot text,
  reminder_mode_snapshot text not null check (reminder_mode_snapshot in ('NONE', 'SAME_DAY', 'DAY_BEFORE')),
  assignee_member_id uuid,
  assignment_origin text not null check (assignment_origin in ('FIXED', 'AUTO', 'MANUAL')),
  is_locked int not null check (is_locked in (0, 1)),
  status text not null check (status in ('TODO', 'DONE', 'SKIPPED', 'CANCELLED')),
  completed_by_member_id uuid,
  completed_at text,
  skipped_reason text check (char_length(skipped_reason) <= 100),
  notes text check (char_length(notes) <= 200),
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  version int not null default 1,
  server_updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (week_plan_id, chore_definition_id, original_local_date)
);

create index if not exists member_sync on public.member(household_id, server_updated_at);
create index if not exists chore_definition_sync on public.chore_definition(household_id, server_updated_at);
create index if not exists week_plan_sync on public.week_plan(household_id, server_updated_at);
create index if not exists week_plan_target_sync on public.week_plan_target(household_id, server_updated_at);
create index if not exists scheduled_chore_sync on public.scheduled_chore(household_id, server_updated_at);

-- ---------------------------------------------------------------------------
-- Read access: members of the household only. No write policies on purpose.
-- ---------------------------------------------------------------------------
create or replace function public.is_household_member(p_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_membership where household_id = p_household and user_id = auth.uid());
$$;
revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

alter table public.household enable row level security;
alter table public.household_membership enable row level security;
alter table public.household_invite enable row level security;
alter table public.join_attempt enable row level security;
alter table public.member enable row level security;
alter table public.chore_definition enable row level security;
alter table public.week_plan enable row level security;
alter table public.week_plan_target enable row level security;
alter table public.scheduled_chore enable row level security;

drop policy if exists "members read household" on public.household;
create policy "members read household" on public.household for select to authenticated using (public.is_household_member(id));
drop policy if exists "members read membership" on public.household_membership;
create policy "members read membership" on public.household_membership for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "members read member" on public.member;
create policy "members read member" on public.member for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "members read chore_definition" on public.chore_definition;
create policy "members read chore_definition" on public.chore_definition for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "members read week_plan" on public.week_plan;
create policy "members read week_plan" on public.week_plan for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "members read week_plan_target" on public.week_plan_target;
create policy "members read week_plan_target" on public.week_plan_target for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "members read scheduled_chore" on public.scheduled_chore;
create policy "members read scheduled_chore" on public.scheduled_chore for select to authenticated using (public.is_household_member(household_id));
-- household_invite and join_attempt: no policies, reachable only through the RPCs.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.require_member(p_household uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.household_membership where household_id = p_household and user_id = uid) then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;
  return uid;
end $$;
revoke all on function public.require_member(uuid) from public;

-- The tables a client may push, with their key columns. Anything else is rejected.
create or replace function public.sync_table_keys(p_table text)
returns text[] language sql immutable as $$
  select case p_table
    when 'household' then array['id']
    when 'member' then array['id']
    when 'chore_definition' then array['id']
    when 'week_plan' then array['id']
    when 'week_plan_target' then array['week_plan_id', 'member_id']
    when 'scheduled_chore' then array['id']
  end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create a shared household from the device's local one (caller becomes OWNER)
-- ---------------------------------------------------------------------------
create or replace function public.create_household(p_household jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if (select count(*) from public.household_membership where user_id = uid) >= 3 then
    raise exception 'too_many_households' using errcode = 'P0001';
  end if;
  insert into public.household (id, name, week_starts_on, metric, share_preset, mode, created_at, updated_at, deleted_at, updated_by)
  select r.id, r.name, r.week_starts_on, r.metric, r.share_preset, 'SHARED', r.created_at, r.updated_at, null, uid
  from jsonb_populate_record(null::public.household, p_household) r;
  insert into public.household_membership (household_id, user_id, role) values ((p_household ->> 'id')::uuid, uid, 'OWNER');
end $$;

-- ---------------------------------------------------------------------------
-- RPC: invites. The app generates a 128-bit random code; only its SHA-256 is stored.
-- ---------------------------------------------------------------------------
create or replace function public.create_invite(p_household uuid, p_code text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_member(p_household); expires timestamptz := now() + interval '7 days';
begin
  if p_code !~ '^[0-9A-HJKMNP-TV-Z]{26}$' then raise exception 'invalid_code_format' using errcode = 'P0001'; end if;
  delete from public.household_invite where household_id = p_household and expires_at < now();
  if (select count(*) from public.household_invite where household_id = p_household) >= 10 then
    raise exception 'too_many_invites' using errcode = 'P0001';
  end if;
  insert into public.household_invite (token_hash, household_id, created_by, expires_at)
  values (sha256(convert_to(p_code, 'UTF8')), p_household, uid, expires);
  return expires;
end $$;

create or replace function public.revoke_invites(p_household uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_member(p_household);
  delete from public.household_invite where household_id = p_household;
end $$;

-- Returns the household id, or null when the code is wrong, expired or used up.
create or replace function public.join_household(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); invite public.household_invite;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  delete from public.join_attempt where attempted_at < now() - interval '1 hour';
  if (select count(*) from public.join_attempt where user_id = uid) >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
  select * into invite from public.household_invite
  where token_hash = sha256(convert_to(upper(replace(p_code, '-', '')), 'UTF8')) and expires_at > now() and uses < max_uses
  for update;
  if invite.token_hash is null then
    -- Returning (not raising) keeps this attempt recorded; an exception would roll the insert back
    -- and make guessing unlimited.
    insert into public.join_attempt (user_id) values (uid);
    return null;
  end if;
  if not exists (select 1 from public.household_membership where household_id = invite.household_id and user_id = uid) then
    if (select count(*) from public.household_membership where household_id = invite.household_id) >= 12 then
      raise exception 'household_full' using errcode = 'P0001';
    end if;
    if (select count(*) from public.household_membership where user_id = uid) >= 3 then
      raise exception 'too_many_households' using errcode = 'P0001';
    end if;
    insert into public.household_membership (household_id, user_id, role) values (invite.household_id, uid, 'MEMBER');
    update public.household_invite set uses = uses + 1 where token_hash = invite.token_hash;
  end if;
  return invite.household_id;
end $$;

-- ---------------------------------------------------------------------------
-- RPC: push. Each change is {table, row, base_version}; base_version 0 means "new on this device".
-- A row is written only when the server still has base_version; otherwise the server row is returned.
-- ---------------------------------------------------------------------------
create or replace function public.push_changes(p_household uuid, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.require_member(p_household);
  change jsonb;
  tbl text;
  keys text[];
  rec jsonb;
  key_filter text;
  current_row jsonb;
  base int;
  columns text;
  updates text;
  results jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 500 then
    raise exception 'invalid_changes' using errcode = 'P0001';
  end if;
  for change in select * from jsonb_array_elements(p_changes) loop
    tbl := change ->> 'table';
    keys := public.sync_table_keys(tbl);
    if keys is null then raise exception 'invalid_table' using errcode = 'P0001'; end if;
    base := coalesce((change ->> 'base_version')::int, 0);
    -- Server-owned columns are never taken from the client.
    rec := (change -> 'row') - 'version' - 'server_updated_at' - 'updated_by' - 'last_active_at' - 'mode';
    if tbl = 'household' then
      if (rec ->> 'id')::uuid is distinct from p_household then raise exception 'wrong_household' using errcode = 'P0001'; end if;
    else
      rec := rec || jsonb_build_object('household_id', p_household);
    end if;

    if exists (select 1 from unnest(keys) k where rec ->> k is null) then raise exception 'missing_key' using errcode = 'P0001'; end if;
    select string_agg(format('t.%I::text = %L', k, rec ->> k), ' and ') into key_filter from unnest(keys) k;
    execute format('select to_jsonb(t) from public.%I t where %s', tbl, key_filter) into current_row;

    if current_row is not null and tbl <> 'household' and (current_row ->> 'household_id')::uuid <> p_household then
      raise exception 'wrong_household' using errcode = 'P0001';
    end if;

    if current_row is not null and (current_row ->> 'version')::int <> base then
      results := results || jsonb_build_object('table', tbl, 'row', current_row, 'status', 'conflict');
      continue;
    end if;
    if current_row is null and tbl = 'household' then
      raise exception 'household_missing' using errcode = 'P0001';
    end if;

    select string_agg(format('%I', column_name), ', ' order by ordinal_position),
           string_agg(format('%I = excluded.%I', column_name, column_name), ', ' order by ordinal_position) filter (where column_name <> all (keys))
      into columns, updates
    from information_schema.columns
    where table_schema = 'public' and table_name = tbl
      and column_name not in ('version', 'server_updated_at', 'updated_by', 'last_active_at', 'mode');

    begin
      execute format(
        'insert into public.%1$I as t (%2$s, version, server_updated_at, updated_by)
           select %2$s, 1, now(), %3$L from jsonb_populate_record(null::public.%1$I, %4$L::jsonb)
         on conflict (%5$s) do update set %6$s, version = t.version + 1, server_updated_at = now(), updated_by = %3$L
         returning to_jsonb(t)',
        tbl, columns, uid, rec, array_to_string(keys, ', '), updates)
      into current_row;
      results := results || jsonb_build_object('table', tbl, 'row', current_row, 'status', 'ok');
    exception when unique_violation then
      -- Another device confirmed the same week first.
      results := results || jsonb_build_object('table', tbl, 'row', rec, 'status', 'duplicate');
    end;
  end loop;
  update public.household set last_active_at = now() where id = p_household;
  return results;
end $$;

-- ---------------------------------------------------------------------------
-- RPC: pull everything changed since a server time. Overlaps a few seconds so a row committed
-- late with an earlier timestamp is not missed; the app applies rows by version, so repeats are harmless.
-- ---------------------------------------------------------------------------
create or replace function public.pull_changes(p_household uuid, p_since timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare since timestamptz := coalesce(p_since, '-infinity'::timestamptz) - interval '10 seconds'; server_time timestamptz := now();
begin
  perform public.require_member(p_household);
  update public.household set last_active_at = now() where id = p_household;
  return jsonb_build_object(
    'server_time', server_time,
    'household', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.household t where id = p_household and server_updated_at > since),
    'member', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.member t where household_id = p_household and server_updated_at > since),
    'chore_definition', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.chore_definition t where household_id = p_household and server_updated_at > since),
    'week_plan', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.week_plan t where household_id = p_household and server_updated_at > since),
    'week_plan_target', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.week_plan_target t where household_id = p_household and server_updated_at > since),
    'scheduled_chore', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.scheduled_chore t where household_id = p_household and server_updated_at > since),
    'member_count', (select count(*) from public.household_membership where household_id = p_household)
  );
end $$;

-- ---------------------------------------------------------------------------
-- RPC: leaving and deleting. The last person to leave takes the household's data with them.
-- ---------------------------------------------------------------------------
create or replace function public.leave_household(p_household uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_member(p_household);
begin
  delete from public.household_membership where household_id = p_household and user_id = uid;
  if not exists (select 1 from public.household_membership where household_id = p_household) then
    delete from public.household where id = p_household;
  elsif not exists (select 1 from public.household_membership where household_id = p_household and role = 'OWNER') then
    update public.household_membership set role = 'OWNER'
    where household_id = p_household and user_id = (select user_id from public.household_membership where household_id = p_household order by joined_at limit 1);
  end if;
end $$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); h uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  for h in select household_id from public.household_membership where user_id = uid loop
    perform public.leave_household(h);
  end loop;
  delete from public.join_attempt where user_id = uid;
  delete from auth.users where id = uid;
end $$;

-- ---------------------------------------------------------------------------
-- Housekeeping (schedule daily with pg_cron, see docs/SHARING.md):
-- anonymous accounts that never joined a household after 30 days, and households unused for 12 months.
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_stale()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from public.household where last_active_at < now() - interval '12 months';
  delete from auth.users u
  where u.is_anonymous is true and u.created_at < now() - interval '30 days'
    and not exists (select 1 from public.household_membership m where m.user_id = u.id);
  delete from public.join_attempt where attempted_at < now() - interval '1 day';
end $$;

-- ---------------------------------------------------------------------------
-- Function access: signed-in (including anonymous) users only. cleanup_stale is for the scheduler.
-- ---------------------------------------------------------------------------
revoke all on function public.create_household(jsonb) from public;
revoke all on function public.create_invite(uuid, text) from public;
revoke all on function public.revoke_invites(uuid) from public;
revoke all on function public.join_household(text) from public;
revoke all on function public.push_changes(uuid, jsonb) from public;
revoke all on function public.pull_changes(uuid, timestamptz) from public;
revoke all on function public.leave_household(uuid) from public;
revoke all on function public.delete_my_account() from public;
revoke all on function public.cleanup_stale() from public;
grant execute on function public.create_household(jsonb) to authenticated;
grant execute on function public.create_invite(uuid, text) to authenticated;
grant execute on function public.revoke_invites(uuid) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.push_changes(uuid, jsonb) to authenticated;
grant execute on function public.pull_changes(uuid, timestamptz) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
