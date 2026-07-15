-- ============================================================================
-- Step 1 (Phase 2 rebuild): Courts × Time-Slots × Bookings schema
--
-- Goals:
--   1. Exactly 3 courts (Court 1/2/3), all type "Pickleball Court".
--   2. time_slots gain a `period` (Afternoon/Evening) and a `price` per slot.
--   3. bookings enforce double-booking prevention at the DATABASE level
--      via a UNIQUE constraint on (court_id, date, time_slot_id) for active rows.
--   4. NO payments table. This is a pay-on-site model. If a payments table
--      exists from prior work, it is dropped.
--   5. Preserve existing Auth + RLS patterns (public.is_admin(), users_view).
--
-- Safe to re-run: this migration is idempotent. Run it in the Supabase SQL
-- Editor (or via the Supabase CLI).
-- ============================================================================

-- Keep the ORIGINAL court id so existing rows/bookings/foreign keys stay valid.
-- Court 1 == the historical single court. Court 2 & 3 are added new.
--   Court 1: 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d  (existing)
--   Court 2: 2a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d  (new)
--   Court 3: 3a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d  (new)

-- ── 1. COURTS ────────────────────────────────────────────────────────────────
-- Ensure the table exists (it already does in production; this is defensive).
create table if not exists public.courts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text
);

-- Add a `court_type` column so every court is explicitly a "Pickleball Court".
alter table public.courts
  add column if not exists court_type text not null default 'Pickleball Court';

-- Add a stable display order so the grid always renders Court 1 → 2 → 3.
alter table public.courts
  add column if not exists sort_order int not null default 0;

-- Seed / normalize EXACTLY 3 courts. Upsert by fixed ids so re-runs are safe.
insert into public.courts (id, name, description, court_type, sort_order) values
  ('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Court 1', 'Pickleball court at Lindaville Phase 2 Multi-Purpose Hall.', 'Pickleball Court', 1),
  ('2a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Court 2', 'Pickleball court at Lindaville Phase 2 Multi-Purpose Hall.', 'Pickleball Court', 2),
  ('3a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Court 3', 'Pickleball court at Lindaville Phase 2 Multi-Purpose Hall.', 'Pickleball Court', 3)
on conflict (id) do update
  set name        = excluded.name,
      court_type  = 'Pickleball Court',
      sort_order  = excluded.sort_order;

-- Enforce the "exactly 3 courts" rule: remove any stray courts that are not
-- one of the three canonical ids. (No-op in a clean install.)
delete from public.courts
 where id not in (
   '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
   '2a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
   '3a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'
 );

-- ── 2. TIME SLOTS ────────────────────────────────────────────────────────────
create table if not exists public.time_slots (
  id         uuid primary key default gen_random_uuid(),
  start_time time not null,
  end_time   time not null
);

-- period groups slots under the "Afternoon" / "Evening" headers in the grid.
alter table public.time_slots
  add column if not exists period text;

-- price is the per-slot amount in PHP (whole pesos). Default ₱350 per reference.
alter table public.time_slots
  add column if not exists price numeric(10,2) not null default 350;

-- Constrain period to the two known values (only after column exists).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'time_slots_period_check'
  ) then
    alter table public.time_slots
      add constraint time_slots_period_check
      check (period in ('Afternoon', 'Evening'));
  end if;
end$$;

-- Backfill period for any existing slots based on start_time, then seed the
-- canonical set of hourly slots from the reference (3PM–12AM).
-- Afternoon: start_time < 18:00 ; Evening: start_time >= 18:00
update public.time_slots
   set period = case when start_time < time '18:00' then 'Afternoon' else 'Evening' end
 where period is null;

-- Seed canonical hourly slots (idempotent: skip if a slot with same start exists).
-- Afternoon block: 3–6 PM. Evening block: 6 PM–12 AM.
insert into public.time_slots (start_time, end_time, period, price)
select v.start_time, v.end_time, v.period, 350
from (values
  (time '15:00', time '16:00', 'Afternoon'),
  (time '16:00', time '17:00', 'Afternoon'),
  (time '17:00', time '18:00', 'Afternoon'),
  (time '18:00', time '19:00', 'Evening'),
  (time '19:00', time '20:00', 'Evening'),
  (time '20:00', time '21:00', 'Evening'),
  (time '21:00', time '22:00', 'Evening'),
  (time '22:00', time '23:00', 'Evening'),
  (time '23:00', time '00:00', 'Evening')
) as v(start_time, end_time, period)
where not exists (
  select 1 from public.time_slots ts where ts.start_time = v.start_time
);

-- Make period NOT NULL now that everything is backfilled.
alter table public.time_slots
  alter column period set not null;

-- ── 3. BOOKINGS + DB-LEVEL DOUBLE-BOOKING PREVENTION ─────────────────────────
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  court_id     uuid not null references public.courts (id) on delete cascade,
  time_slot_id uuid not null references public.time_slots (id) on delete cascade,
  date         date not null,
  status       text not null default 'reserved',
  created_at   timestamptz not null default now()
);

-- Allow the reference "reserved" status alongside the legacy admin flow
-- (pending / approved / rejected / cancelled). No payment status fields.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'bookings_status_check') then
    alter table public.bookings drop constraint bookings_status_check;
  end if;
  alter table public.bookings
    add constraint bookings_status_check
    check (status in ('reserved','pending','approved','rejected','cancelled'));
end$$;

-- DB-LEVEL double-booking prevention.
-- A court+date+slot can only have ONE *active* booking. Cancelled/rejected
-- rows are freed so the slot can be re-booked. We use a PARTIAL UNIQUE INDEX
-- filtered to active statuses (this is the database-level guarantee the UI
-- relies on; error code 23505 is surfaced to the client).
drop index if exists bookings_active_unique_idx;
create unique index bookings_active_unique_idx
  on public.bookings (court_id, date, time_slot_id)
  where status in ('reserved','pending','approved');

-- Helpful index for the grid's "which slots are booked on this date" query.
create index if not exists bookings_date_court_idx
  on public.bookings (date, court_id);

-- ── 4. NO PAYMENTS TABLE (pay-on-site only) ──────────────────────────────────
-- Explicitly drop any payments artifacts from prior experiments. Pay-on-site
-- means there is NEVER a payment gateway, proof upload, or payment status.
drop table if exists public.payments cascade;

-- ── 5. ROW LEVEL SECURITY (preserve existing patterns) ───────────────────────
-- Reuses public.is_admin() defined in 003_announcements.sql.

alter table public.courts     enable row level security;
alter table public.time_slots enable row level security;
alter table public.bookings   enable row level security;

-- COURTS: readable by everyone (public court info); writable by admins only.
drop policy if exists "courts_read_all"     on public.courts;
drop policy if exists "courts_write_admin"  on public.courts;
create policy "courts_read_all"
  on public.courts for select to anon, authenticated using (true);
create policy "courts_write_admin"
  on public.courts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- TIME SLOTS: readable by everyone; managed by admins only.
drop policy if exists "time_slots_read_all"    on public.time_slots;
drop policy if exists "time_slots_write_admin" on public.time_slots;
create policy "time_slots_read_all"
  on public.time_slots for select to anon, authenticated using (true);
create policy "time_slots_write_admin"
  on public.time_slots for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- BOOKINGS:
--   READ: any authenticated user can read bookings (needed so the grid shows
--         which slots are already booked by anyone). No PII is exposed here.
--   INSERT: a user may only create bookings for themselves.
--   UPDATE/DELETE: owner may cancel own booking; admins may manage any.
drop policy if exists "bookings_read_authenticated" on public.bookings;
drop policy if exists "bookings_insert_own"         on public.bookings;
drop policy if exists "bookings_update_own_or_admin" on public.bookings;
drop policy if exists "bookings_delete_own_or_admin" on public.bookings;

create policy "bookings_read_authenticated"
  on public.bookings for select to authenticated using (true);

create policy "bookings_insert_own"
  on public.bookings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "bookings_update_own_or_admin"
  on public.bookings for update to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "bookings_delete_own_or_admin"
  on public.bookings for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ── 6. Realtime (grid live-updates already subscribe to public.bookings) ─────
-- Ensure the bookings table is in the realtime publication (safe if present).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end$$;

-- ============================================================================
-- Verification queries (optional — run manually to confirm):
--   select count(*) from public.courts;                 -- expect 3
--   select name, court_type, sort_order from public.courts order by sort_order;
--   select start_time, end_time, period, price from public.time_slots order by start_time;
--   select indexname from pg_indexes where tablename = 'bookings';
--   select to_regclass('public.payments');              -- expect NULL
-- ============================================================================
