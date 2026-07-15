import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

/* ══════════════════════════════════════════════════════════════════════
   TimeSlotCourtGrid
   ----------------------------------------------------------------------
   A time-slot × court availability grid (Step 2 of the booking flow).

   Layout (matches reference):
     • Sticky header row  →  "Time" + one column per court ("Court N" +
       "Pickleball Court" subtitle).
     • Sticky left column →  time range ("3:00 PM - 4:00 PM") + price
       ("₱350") beneath, grouped under full-width "Afternoon" / "Evening"
       section-header rows.
     • Each interior cell is a <button> with exactly one of 3 states:
         - available : empty / light, clickable
         - booked    : gray, disabled, label "Booked"
         - selected  : navy highlight, white ✓ checkmark, label "Selected"

   Data (real-time, per court × slot × date, straight from Supabase):
     • courts       (ordered by sort_order)
     • time_slots   (ordered by start_time, grouped by period)
     • bookings     (for the selected date; any active status = booked)
     • realtime subscription to public.bookings refreshes the grid live.

   Selection is MULTI-slot: the parent owns an ARRAY of { courtId, slotId, … }
   selections via `value` / `onChange`. All slots share the same date but may
   live on different courts. Tapping an available cell toggles it in/out of the
   array; the parent renders the sticky "X court(s) · Y slot(s)" Book Now bar.
   ══════════════════════════════════════════════════════════════════════ */

// Statuses that occupy a slot (i.e. render as "Booked"). Cancelled / rejected
// bookings free the slot again, so they are treated as available.
const ACTIVE_STATUSES = ['reserved', 'pending', 'approved']
const PERIOD_ORDER = ['Afternoon', 'Evening']

function formatTimeToAMPM(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

function formatPeso(amount) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '₱0'
  // Whole pesos when there are no centavos, else 2 decimals.
  return n % 1 === 0 ? `₱${n.toLocaleString('en-PH')}` : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function bookingKey(courtId, slotId) {
  return `${courtId}::${slotId}`
}

// Column-sizing constants. On wide screens we keep comfortable fixed widths;
// on narrow screens we shrink both columns so that AT LEAST 3 court columns
// stay visible alongside the sticky time column (matches the reference layout,
// where the grid scrolls horizontally to reveal further courts).
const MIN_VISIBLE_COURTS = 3
const TIME_COL_WIDE = 148
const COURT_COL_WIDE = 128
const TIME_COL_MIN = 104 // narrowest the sticky time column may get
const COURT_COL_MIN = 88 // narrowest a court column may get (still tappable)

export default function TimeSlotCourtGrid({ date, value = [], onChange }) {
  const [courts, setCourts] = useState([])
  const [slots, setSlots] = useState([])
  const [bookedKeys, setBookedKeys] = useState(() => new Set())
  const [loadingStatic, setLoadingStatic] = useState(true) // courts + slots
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [error, setError] = useState(null)

  // Measure the scroll container so we can guarantee that ≥3 courts fit within
  // the visible width on small screens, compressing columns as needed.
  const scrollRef = useRef(null)
  const [viewportW, setViewportW] = useState(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setViewportW(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep the latest date in a ref so the realtime handler always refetches
  // for the currently-selected date without re-subscribing on every change.
  const dateRef = useRef(date)
  useEffect(() => {
    dateRef.current = date
  }, [date])

  // ── 1. Fetch courts + time slots once (they rarely change) ──────────────
  useEffect(() => {
    let alive = true
    async function fetchStatic() {
      setLoadingStatic(true)
      const [courtsRes, slotsRes] = await Promise.all([
        supabase.from('courts').select('id, name, court_type, sort_order').order('sort_order', { ascending: true }),
        supabase.from('time_slots').select('id, start_time, end_time, period, price').order('start_time', { ascending: true }),
      ])
      if (!alive) return
      if (courtsRes.error || slotsRes.error) {
        setError((courtsRes.error || slotsRes.error).message)
      } else {
        setCourts(courtsRes.data ?? [])
        setSlots(slotsRes.data ?? [])
      }
      setLoadingStatic(false)
    }
    fetchStatic()
    return () => {
      alive = false
    }
  }, [])

  // ── 2. Fetch bookings for the selected date (court × slot occupancy) ────
  const fetchBookings = useCallback(async (forDate) => {
    if (!forDate) return
    setLoadingBookings(true)
    const { data, error: err } = await supabase
      .from('bookings')
      .select('court_id, time_slot_id, status')
      .eq('date', forDate)
      .in('status', ACTIVE_STATUSES)

    if (err) {
      setError(err.message)
    } else {
      const next = new Set()
      for (const b of data ?? []) next.add(bookingKey(b.court_id, b.time_slot_id))
      setBookedKeys(next)
      setError(null)
    }
    setLoadingBookings(false)
  }, [])

  useEffect(() => {
    // Schedule off the synchronous render path so the loading-state update
    // inside fetchBookings doesn't trigger a cascading-render lint warning.
    const id = setTimeout(() => fetchBookings(date), 0)
    return () => clearTimeout(id)
  }, [date, fetchBookings])

  // ── 3. Realtime: refresh the grid whenever bookings change anywhere ─────
  useEffect(() => {
    const channel = supabase
      .channel('grid-booking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        // Refetch for whatever date is currently shown.
        fetchBookings(dateRef.current)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchBookings])

  // ── 4. If any currently-selected cell becomes booked (someone else took it
  //       via realtime), drop just that cell so the selection stays honest. ──
  useEffect(() => {
    if (!value.length) return
    const stillValid = value.filter((s) => !bookedKeys.has(bookingKey(s.courtId, s.slotId)))
    if (stillValid.length !== value.length) onChange?.(stillValid)
  }, [bookedKeys, value, onChange])

  // Fast lookup of which court×slot cells are currently selected.
  const selectedKeys = useMemo(() => {
    const set = new Set()
    for (const s of value) set.add(bookingKey(s.courtId, s.slotId))
    return set
  }, [value])

  // Group slots by period, preserving Afternoon → Evening order.
  const groupedSlots = useMemo(() => {
    const groups = new Map()
    for (const s of slots) {
      if (!groups.has(s.period)) groups.set(s.period, [])
      groups.get(s.period).push(s)
    }
    const known = PERIOD_ORDER.filter((p) => groups.has(p)).map((p) => [p, groups.get(p)])
    const extra = [...groups.keys()].filter((p) => !PERIOD_ORDER.includes(p)).map((p) => [p, groups.get(p)])
    return [...known, ...extra]
  }, [slots])

  const loading = loadingStatic || loadingBookings

  function handleSelect(court, slot) {
    const key = bookingKey(court.id, slot.id)
    const isSelected = selectedKeys.has(key)
    if (isSelected) {
      // Toggle off: remove this court×slot from the selection array.
      onChange?.(value.filter((s) => bookingKey(s.courtId, s.slotId) !== key))
    } else {
      // Toggle on: append this court×slot to the selection array.
      onChange?.([
        ...value,
        {
          courtId: court.id,
          courtName: court.name,
          slotId: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          price: Number(slot.price),
          period: slot.period,
        },
      ])
    }
  }

  // Grid template: sticky first column (time) + one fixed column per court.
  // Compute responsive widths so that on narrow viewports at least
  // MIN_VISIBLE_COURTS columns remain visible next to the sticky time column.
  const { timeCol, compact, gridTemplateColumns } = useMemo(() => {
    let time = TIME_COL_WIDE
    let court = COURT_COL_WIDE
    // Only compress once we've measured a viewport that can't fit the wide
    // layout's 3 courts + time column. viewportW === 0 => not yet measured,
    // so fall back to the comfortable wide defaults.
    if (viewportW > 0 && viewportW < TIME_COL_WIDE + COURT_COL_WIDE * MIN_VISIBLE_COURTS) {
      // Shrink the time column first (down to its min), then the courts, so
      // MIN_VISIBLE_COURTS still fit. Never go below the per-column minimums.
      time = Math.max(TIME_COL_MIN, Math.min(TIME_COL_WIDE, viewportW - COURT_COL_MIN * MIN_VISIBLE_COURTS))
      court = Math.max(COURT_COL_MIN, Math.floor((viewportW - time) / MIN_VISIBLE_COURTS))
    }
    const n = Math.max(courts.length, 1)
    return {
      timeCol: time,
      compact: court < COURT_COL_WIDE || time < TIME_COL_WIDE,
      gridTemplateColumns: `${time}px repeat(${n}, minmax(${court}px, 1fr))`,
    }
  }, [viewportW, courts.length])

  // ── Error state ─────────────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-red-700">Couldn’t load availability.</p>
        <p className="mt-1 text-xs text-red-500">{error}</p>
        <button onClick={() => fetchBookings(date)} className="btn btn-ghost mt-3 px-4 py-2 text-sm">
          Try again
        </button>
      </div>
    )
  }

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loadingStatic) {
    return (
      <div className="overflow-hidden rounded-xl border border-court-100">
        <div className="skeleton h-14 w-full" />
        <div className="space-y-px bg-court-50 p-px">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (courts.length === 0 || slots.length === 0) {
    return (
      <div className="rounded-xl border border-court-100 bg-court-50/50 px-4 py-10 text-center">
        <p className="type-body">No courts or time slots are configured yet. Please check back soon.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Scroll container: horizontal scroll reveals additional court columns. */}
      <div
        ref={scrollRef}
        className="relative overflow-x-auto overflow-y-hidden rounded-xl border border-court-100"
        role="grid"
        aria-label="Court availability by time slot"
      >
        <div className="min-w-max" style={{ position: 'relative' }}>
          {/* ── Header row: Time + court columns (sticky to top) ───────── */}
          <div
            className="sticky top-0 z-30 grid border-b border-court-100 bg-white"
            style={{ gridTemplateColumns }}
            role="row"
          >
            <div
              className={[
                'sticky left-0 z-40 flex items-center bg-white py-3',
                'shadow-[1px_0_0_0_theme(colors.court.100)]',
                compact ? 'px-2.5' : 'px-4',
              ].join(' ')}
              role="columnheader"
            >
              <span className="font-display text-sm font-bold text-court-800">Time</span>
            </div>
            {courts.map((court) => (
              <div
                key={court.id}
                role="columnheader"
                className="border-l border-court-50 px-2 py-3 text-center"
              >
                <div className="font-display text-sm font-bold text-court-800">{court.name}</div>
                <div className="mt-0.5 text-[11px] font-medium text-court-400">
                  {court.court_type || 'Pickleball Court'}
                </div>
              </div>
            ))}
          </div>

          {/* ── Body: per-period sections ──────────────────────────────── */}
          {groupedSlots.map(([period, periodSlots]) => (
            <div key={period} role="rowgroup">
              {/* Full-width section header row. The colored band spans the whole
                  grid width so it reads as one continuous row, but the LABEL is
                  wrapped in a sticky element pinned to the visible left edge so
                  "Afternoon" / "Evening" stays readable while scrolling right. */}
              <div
                className="border-b border-court-100 bg-court-50/70"
                role="row"
              >
                <div
                  className={['sticky left-0 z-20 py-2', compact ? 'px-2.5' : 'px-4'].join(' ')}
                  style={{ width: timeCol }}
                >
                  <span className="type-eyebrow whitespace-nowrap text-court-500">{period}</span>
                </div>
              </div>

              {/* Slot rows */}
              {periodSlots.map((slot) => (
                <div
                  key={slot.id}
                  role="row"
                  className="grid border-b border-court-50 last:border-b-0"
                  style={{ gridTemplateColumns }}
                >
                  {/* Sticky time + price cell */}
                  <div
                    role="rowheader"
                    className={[
                      'sticky left-0 z-10 flex flex-col justify-center bg-white py-3',
                      'shadow-[1px_0_0_0_theme(colors.court.50)]',
                      compact ? 'px-2.5' : 'px-4',
                    ].join(' ')}
                  >
                    <span className="text-sm font-semibold leading-tight text-court-800">
                      {formatTimeToAMPM(slot.start_time)} - {formatTimeToAMPM(slot.end_time)}
                    </span>
                    <span className="mt-0.5 text-xs font-bold text-amber-500">{formatPeso(slot.price)}<span className="font-semibold text-court-400">/head</span></span>
                  </div>

                  {/* One cell per court */}
                  {courts.map((court) => {
                    const isBooked = bookedKeys.has(bookingKey(court.id, slot.id))
                    const isSelected = selectedKeys.has(bookingKey(court.id, slot.id))
                    const state = isSelected ? 'selected' : isBooked ? 'booked' : 'available'

                    return (
                      <div key={court.id} role="gridcell" className="border-l border-court-50 p-1.5">
                        <button
                          type="button"
                          disabled={isBooked}
                          onClick={() => handleSelect(court, slot)}
                          aria-pressed={isSelected}
                          aria-label={`${court.name}, ${formatTimeToAMPM(slot.start_time)} to ${formatTimeToAMPM(
                            slot.end_time,
                          )}, ${state}`}
                          data-state={state}
                          className={[
                            'focusable flex h-14 w-full flex-col items-center justify-center gap-0.5',
                            'rounded-lg border text-xs font-semibold transition-all duration-150',
                            isSelected
                              ? 'bg-court-grad border-transparent text-white shadow-card-hover'
                              : isBooked
                                ? 'cursor-not-allowed border-slate-200/70 bg-slate-100 text-slate-400'
                                : 'cursor-pointer border-court-100 bg-court-50/40 text-transparent hover:border-court-500 hover:bg-court-50 hover:shadow-sm',
                          ].join(' ')}
                        >
                          {isSelected ? (
                            <>
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                                aria-hidden="true"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-[11px] font-bold tracking-wide">Selected</span>
                            </>
                          ) : isBooked ? (
                            <span className="text-[11px] font-semibold tracking-wide">Booked</span>
                          ) : (
                            // Available: keep the button visually empty but
                            // preserve a label for screen readers.
                            <span className="sr-only">Available</span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Subtle live-refresh shimmer over the grid when re-fetching bookings */}
        {loadingBookings && !loadingStatic && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 animate-[skeleton-shimmer_1.2s_infinite] bg-amber-400/70" />
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs font-medium text-court-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-court-100 bg-court-50/40" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-court-grad h-3.5 w-3.5 rounded" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-slate-200 bg-slate-100" />
          Booked
        </span>
      </div>
    </div>
  )
}
