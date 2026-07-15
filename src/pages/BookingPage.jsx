import { useState } from 'react'
import { useAuth } from '../context/authContextStore'
import { supabase } from '../lib/supabaseClient'
import TimeSlotCourtGrid from '../components/TimeSlotCourtGrid'
import BookingConfirmation from '../components/BookingConfirmation'

const TIMEZONE = 'Asia/Manila'

function formatManilaDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatPeso(amount) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '₱0'
  return n % 1 === 0 ? `₱${n.toLocaleString('en-PH')}` : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

// Headcount bounds must match the DB check constraint (bookings_players_check).
const MIN_PLAYERS = 1
const MAX_PLAYERS = 8

// Derive a short, human-readable booking reference from a booking UUID.
// Example: '3a2b3c4d-…' -> 'LV-3A2B3C4D'. The full UUID stays the source of
// truth in the DB; this is just the customer-facing code to quote on-site.
function makeReference(uuid) {
  if (!uuid) return 'LV-XXXXXXXX'
  return `LV-${uuid.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export default function BookingPage() {
  const { user } = useAuth()

  const todayManila = formatManilaDate(new Date())
  const [selectedDate, setSelectedDate] = useState(todayManila)
  // selections = array of { courtId, courtName, slotId, startTime, endTime, price, period }
  // All share `selectedDate`; slots may span different courts.
  const [selections, setSelections] = useState([])
  const [players, setPlayers] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  // When set, the flow switches to the screenshot-ready confirmation screen.
  const [confirmation, setConfirmation] = useState(null)

  const slotCount = selections.length
  // Distinct courts touched by the current selection.
  const courtCount = new Set(selections.map((s) => s.courtId)).size
  // Per-head pricing: each selected slot is charged price × players.
  const perHeadSum = selections.reduce((sum, s) => sum + s.price, 0)
  const total = perHeadSum * players

  function handleDateChange(e) {
    setSelectedDate(e.target.value)
    setSelections([])
    setMessage(null)
  }

  function adjustPlayers(delta) {
    setPlayers((prev) => Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, prev + delta)))
  }

  async function handleConfirmBooking() {
    if (!selections.length) return
    setSubmitting(true)
    setMessage(null)

    const rows = selections.map((s) => ({
      user_id: user.id,
      court_id: s.courtId,
      date: selectedDate,
      time_slot_id: s.slotId,
      players,
      // Pay-on-site model: a confirmed booking is immediately "reserved".
      // There is no payment status — the slot is held for on-site payment.
      status: 'reserved',
    }))

    // Insert all selected slots in one request and return the inserted rows so
    // we can build the confirmation (booking id → reference). The partial
    // unique index guarantees no active double-booking; a single conflicting
    // row (23505) aborts the whole insert, so we surface it and keep the
    // selection intact.
    const { data: inserted, error } = await supabase.from('bookings').insert(rows).select('id, created_at')

    if (error) {
      if (error.code === '23505') {
        // DB-level double-booking guard tripped: one of the picked slots was
        // grabbed by someone else. The realtime grid will drop it shortly.
        setMessage(
          'One or more of your selected slots was just booked by someone else. Please review your selection and try again.',
        )
      } else {
        setMessage(`Error: ${error.message}`)
      }
      setSubmitting(false)
      return
    }

    // Build the screenshot-ready confirmation. The reference is derived from
    // the earliest-created inserted booking so a multi-slot reservation shares
    // one code the player can quote at the venue.
    const firstId = (inserted ?? [])
      .slice()
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0]?.id

    const items = selections
      .slice()
      .sort(
        (a, b) =>
          a.courtName.localeCompare(b.courtName, undefined, { numeric: true }) ||
          a.startTime.localeCompare(b.startTime),
      )
      .map((s) => ({
        courtName: s.courtName,
        startTime: s.startTime,
        endTime: s.endTime,
        period: s.period,
        price: s.price,
      }))

    setConfirmation({
      reference: makeReference(firstId),
      date: selectedDate,
      players,
      perHeadSum,
      total,
      items,
    })
    setSubmitting(false)
  }

  // Reset the whole flow back to a fresh, empty booking form.
  function handleBookAnother() {
    setConfirmation(null)
    setSelections([])
    setPlayers(2)
    setMessage(null)
    setSelectedDate(todayManila)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Once a booking succeeds, replace the form with the screenshot-ready summary.
  if (confirmation) {
    return <BookingConfirmation confirmation={confirmation} onBookAnother={handleBookAnother} />
  }

  return (
    <div className="min-h-screen bg-court-dots py-8 sm:py-12 px-4">
      <div className="mx-auto max-w-5xl xl:max-w-6xl">
        <div className="mb-8 text-center sm:mb-10">
          <span className="type-eyebrow mb-2 block text-amber-500">Reserve your game</span>
          <h1 className="type-h1 mb-2 text-3xl text-court-700 sm:text-4xl">Book a Court</h1>
          <p className="type-body">Pick a date, choose an open slot on any court, and confirm in seconds.</p>
        </div>

        {/* Date Picker Section */}
        <div className="card mb-5 p-6 sm:p-7">
          <label className="field-label mb-3 flex items-center gap-2.5">
            <span className="step-dot bg-court-100 text-court-700">1</span>
            Select a date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={todayManila}
            className="field-input focusable"
          />
        </div>

        {/* Time-slot × Court Grid Section */}
        <div className="card mb-5 p-4 sm:p-6">
          <label className="field-label mb-5 flex items-center gap-2.5">
            <span className="step-dot bg-court-100 text-court-700">2</span>
            Select a court &amp; time slot
          </label>

          <TimeSlotCourtGrid date={selectedDate} value={selections} onChange={setSelections} />
          {slotCount > 0 && (
            <p className="mt-4 text-sm font-medium text-court-500">
              {slotCount} {slotCount === 1 ? 'slot' : 'slots'} selected across {courtCount}{' '}
              {courtCount === 1 ? 'court' : 'courts'}. Tap a highlighted slot again to remove it.
            </p>
          )}
        </div>

        {/* Number of Players Section (per-head pricing) */}
        {slotCount > 0 && (
          <div className="card fade-in-up mb-5 p-6 sm:p-7">
            <label className="field-label mb-3 flex items-center gap-2.5">
              <span className="step-dot bg-court-100 text-court-700">3</span>
              How many players?
            </label>
            <p className="mb-4 text-sm" style={{ color: 'var(--ink-muted)' }}>
              Pricing is <span className="font-semibold text-court-700">per head</span>, applied to
              each selected slot. The same headcount is used for all{' '}
              {slotCount === 1 ? 'slot' : `${slotCount} slots`}.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Stepper */}
              <div className="inline-flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustPlayers(-1)}
                  disabled={players <= MIN_PLAYERS}
                  aria-label="Decrease players"
                  className="focusable flex h-11 w-11 items-center justify-center rounded-xl border border-court-100 text-xl font-bold text-court-700 transition-colors hover:bg-court-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span
                  className="font-display min-w-[3ch] text-center text-3xl font-extrabold text-court-900"
                  aria-live="polite"
                >
                  {players}
                </span>
                <button
                  type="button"
                  onClick={() => adjustPlayers(1)}
                  disabled={players >= MAX_PLAYERS}
                  aria-label="Increase players"
                  className="focusable flex h-11 w-11 items-center justify-center rounded-xl border border-court-100 text-xl font-bold text-court-700 transition-colors hover:bg-court-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
                <span className="ml-1 text-sm font-medium text-court-400">
                  {players === 1 ? 'player' : 'players'}
                </span>
              </div>

              {/* Live total breakdown */}
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-widest text-court-400">
                  {formatPeso(perHeadSum)}/head × {players}
                </div>
                <div className="font-display text-2xl font-extrabold text-court-900">
                  {formatPeso(total)}
                </div>
              </div>
            </div>
          </div>
        )}

        {message && (
          <p
            role={message.startsWith('Error') || message.includes('booked by someone') ? 'alert' : 'status'}
            className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${
              message.startsWith('Error') || message.includes('booked by someone')
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'border border-court-100 bg-court-50 text-court-700'
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {/* ── Sticky selection / "Book Now" summary bar (always visible) ───── */}
      <div className="sticky bottom-0 z-40 mt-6 border-t border-court-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 xl:max-w-6xl">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-court-400">
              {courtCount} {courtCount === 1 ? 'court' : 'courts'} · {slotCount}{' '}
              {slotCount === 1 ? 'slot' : 'slots'}
              {slotCount > 0 && (
                <>
                  {' '}
                  · {players} {players === 1 ? 'player' : 'players'}
                </>
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold text-court-900">
                {formatPeso(total)}
              </span>
              {slotCount > 0 ? (
                <span className="hidden truncate text-sm text-court-500 sm:inline">
                  {formatPeso(perHeadSum)}/head total × {players}
                </span>
              ) : (
                <span className="hidden text-sm text-court-500 sm:inline">
                  Select at least one open slot to book
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleConfirmBooking}
            disabled={submitting || slotCount === 0}
            className="btn btn-primary shrink-0 px-8 py-4 text-base font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Book Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
