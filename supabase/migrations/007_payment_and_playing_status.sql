-- ============================================================================
-- Migration 007: Admin operations — payment confirmation + playing lifecycle
--
-- Business need (from admin/venue staff):
--   1. See WHICH COURT each booking is for (already stored as bookings.court_id;
--      this migration adds no column for that — the UI just needs to join
--      public.courts. Documented here for completeness.)
--   2. Confirm that a specific user has PAID (pay-on-site cash model). This is
--      an operational fact that is INDEPENDENT of the booking lifecycle: a
--      reservation can be approved yet still unpaid, or paid before play.
--   3. Track that a booking is CURRENTLY PLAYING, and later COMPLETED, so staff
--      have a live operational view of the court.
--
-- Design decision (senior dev):
--   * payment_status is a SEPARATE column from status. Do NOT overload the
--     single lifecycle enum with payment meaning — you would lose the ability
--     to answer "who is playing but still owes money?".
--   * The playing lifecycle is expressed by EXTENDING the existing status enum
--     with 'playing' and 'completed', preserving the current admin flow.
--
-- Safe to re-run: idempotent.
-- ============================================================================

-- ── 1. PAYMENT STATUS (independent of booking lifecycle) ─────────────────────
alter table public.bookings
  add column if not exists payment_status text not null default 'unpaid';

-- When the payment was confirmed by an admin (audit / reporting).
alter table public.bookings
  add column if not exists paid_at timestamptz;

-- Constrain payment_status to the two known values.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_payment_status_check'
  ) then
    alter table public.bookings
      add constraint bookings_payment_status_check
      check (payment_status in ('unpaid', 'paid'));
  end if;
end$$;

-- ── 2. EXTEND THE LIFECYCLE STATUS with 'playing' and 'completed' ────────────
-- Rebuild the check constraint to include the two new operational statuses.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'bookings_status_check') then
    alter table public.bookings drop constraint bookings_status_check;
  end if;
  alter table public.bookings
    add constraint bookings_status_check
    check (status in (
      'reserved','pending','approved','rejected','cancelled',
      'playing','completed'
    ));
end$$;

-- ── 3. DOUBLE-BOOKING GUARANTEE stays consistent ────────────────────────────
-- A court+date+slot should remain a single ACTIVE occupancy. 'playing' is an
-- active occupancy; 'completed' frees the slot (the game is over). Rebuild the
-- partial unique index to include 'playing' as active.
drop index if exists bookings_active_unique_idx;
create unique index bookings_active_unique_idx
  on public.bookings (court_id, date, time_slot_id)
  where status in ('reserved','pending','approved','playing');

-- ── 4. Keep the reporting view in sync (adds new columns automatically) ──────
-- Drop and recreate the view to avoid column‑order errors when new columns
-- are added to the bookings table.
drop view if exists public.bookings_with_total;
create view public.bookings_with_total as
  select
    b.*,
    ts.price                              as price_per_head,
    (ts.price * b.players)::numeric(10,2) as total_amount
  from public.bookings b
  join public.time_slots ts on ts.id = b.time_slot_id;

-- ============================================================================
-- Verification (optional):
--   select conname from pg_constraint where conname in
--     ('bookings_payment_status_check','bookings_status_check');
--   select status, payment_status, paid_at from public.bookings limit 5;
-- ============================================================================