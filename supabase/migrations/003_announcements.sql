-- ============================================================================
-- Step 3: Community Announcement Board
-- Table + Row Level Security for admin-authored announcements.
--
-- Run this in the Supabase SQL Editor (or via the Supabase CLI).
-- ============================================================================

-- ── Table ───────────────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  body        text        not null,
  created_at  timestamptz not null default now(),
  created_by  uuid        references auth.users (id) on delete set null,
  is_active   boolean     not null default true
);

-- Helpful indexes for the homepage feed (active, newest first).
create index if not exists announcements_active_created_idx
  on public.announcements (is_active, created_at desc);

-- ── Helper: is the current JWT an admin? ─────────────────────────────────────
-- The app stores the admin flag in auth user_metadata.role === 'admin',
-- which Supabase exposes on the JWT as raw_user_meta_data / user_metadata.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.announcements enable row level security;

-- Drop existing policies so this migration is re-runnable.
drop policy if exists "announcements_read_authenticated" on public.announcements;
drop policy if exists "announcements_insert_admin"       on public.announcements;
drop policy if exists "announcements_update_admin"       on public.announcements;
drop policy if exists "announcements_delete_admin"       on public.announcements;

-- READ: any authenticated user can read all announcements.
-- (The homepage additionally filters is_active = true client-side.)
create policy "announcements_read_authenticated"
  on public.announcements
  for select
  to authenticated
  using (true);

-- INSERT: only admins may create announcements.
create policy "announcements_insert_admin"
  on public.announcements
  for insert
  to authenticated
  with check (public.is_admin());

-- UPDATE: only admins may edit / toggle announcements.
create policy "announcements_update_admin"
  on public.announcements
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- DELETE: only admins may delete announcements.
create policy "announcements_delete_admin"
  on public.announcements
  for delete
  to authenticated
  using (public.is_admin());
