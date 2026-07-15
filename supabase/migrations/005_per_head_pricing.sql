-- ============================================================================
-- Step (Phase 2): Per-head pricing for bookings
--
-- Business change:
--   The slot `price` is a PER-HEAD (per-person) rate, NOT a flat per-slot rate.
--   A booking now records how many players (heads) it is for, and the amount
--   due is computed as:  time_slots.price  ×  bookings.players
--
-- Design notes:
--   * We keep time_slots.price as the single source of truth for the rate.
--     It is simply reinterpreted as "price per head". No data migration of the
--     price column is needed.
--   * We add bookings.players (headcount). Existing rows default to 2, which
--     is the natural minimum for a pickleball game (singles = 2, doubles = 4).
--     Adjust the default below if the venue prefers a different assumption.
--   * The double-booking guarantee is unchanged: a court+date+slot is still a
--     single active booking. players only affects the amount, not occupancy.
--
-- Safe to re-run: idempotent.
-- ============================================================================

-- ── 1. Add the players (headcount) column ────────────────────────────────────
alter table public.bookings
  add column if not exists players int not null default 2;

-- ── 2. Guard the headcount to a sane range (1..8) ────────────────────────────
--   1 lower bound = at least one paying head.
--   8 upper bound = generous cap for a single court booking; tune as needed.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_players_check'
  ) then
    alter table public.bookings
      add constraint bookings_players_check
      check (players >= 1 and players <= 8);
  end if;
end$$;

-- ── 3. (Optional convenience) A read-only view exposing the computed total ───
--   The app computes total on the fly (price × players), but this view is handy
--   for reporting / admin exports without duplicating the math in SQL clients.
create or replace view public.bookings_with_total as
  select
    b.*,
    ts.price                          as price_per_head,
    (ts.price * b.players)::numeric(10,2) as total_amount
  from public.bookings b
  join public.time_slots ts on ts.id = b.time_slot_id;

-- ============================================================================
-- Verification (optional):
--   select id, players from public.bookings limit 5;              -- players present
--   select conname from pg_constraint where conname = 'bookings_players_check';
--   select price_per_head, players, total_amount
--     from public.bookings_with_total limit 5;
-- ============================================================================
