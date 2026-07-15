-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006: Rename the first court back to "Court 1"
--
-- Context:
--   The first court (canonical id 1a2b3c4d-…) had been renamed to
--   "Lindaville Ace Paddlers" via Admin Panel → Court Info. The booking court
--   grid (TimeSlotCourtGrid) renders `court.name` straight from the DB, so the
--   header column showed "Lindaville Ace Paddlers" instead of "Court 1".
--
--   This migration normalizes the stored name back to "Court 1" so the grid
--   header reads "Court 1 / Court 2 / Court 3" again. Idempotent and safe to
--   re-run.
-- ─────────────────────────────────────────────────────────────────────────────

update public.courts
   set name = 'Court 1'
 where id = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';

-- Verify (manual):
--   select name from public.courts order by sort_order;  -- expect Court 1/2/3
