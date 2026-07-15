import { Link } from 'react-router-dom'

/* ══════════════════════════════════════════════════════════════════════
   BookingConfirmation
   ----------------------------------------------------------------------
   A screenshot-ready reservation summary shown after a successful booking
   (Step 4 of the flow). It is intentionally a single, self-contained card
   that captures everything a player needs to show at the venue:

     • Booking reference ID (short, human-readable)
     • Court(s) reserved
     • Date
     • Time slot(s)
     • Total amount due (per-head rate × players)
     • Pay-on-site note

   No payment status is shown — this venue is pay-on-site. The card is built
   so a phone screenshot of just this card is a complete, self-explanatory
   "e-ticket". A print/screenshot hint sits below the card (outside the
   screenshot frame is fine — it's not part of the ticket).
   ══════════════════════════════════════════════════════════════════════ */

const TIMEZONE = 'Asia/Manila'

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

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
  return n % 1 === 0
    ? `₱${n.toLocaleString('en-PH')}`
    : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

/**
 * confirmation shape (built in BookingPage after a successful insert):
 * {
 *   reference: 'LV-3A4B5C6D',
 *   date: '2026-07-15',
 *   players: 2,
 *   perHeadSum: 350,
 *   total: 700,
 *   // one entry per reserved slot, sorted by court then start time
 *   items: [{ courtName, startTime, endTime, period, price }, ...]
 * }
 */
export default function BookingConfirmation({ confirmation, onBookAnother }) {
  if (!confirmation) return null

  const { reference, date, players, perHeadSum, total, items } = confirmation
  const slotCount = items.length
  const courtNames = [...new Set(items.map((i) => i.courtName))]

  return (
    <div className="min-h-screen bg-court-dots px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        {/* Success heading (outside the ticket) */}
        <div className="fade-in-up mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-court-grad shadow-card-hover">
            <svg
              className="h-9 w-9 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="type-h1 mb-1 text-2xl text-court-700 sm:text-3xl">Reservation Confirmed</h1>
          <p className="type-body">Screenshot this summary and present it at the venue.</p>
        </div>

        {/* ── The screenshot-ready ticket card ─────────────────────────── */}
        <div className="card fade-in-up overflow-hidden p-0">
          {/* Ticket header */}
          <div className="bg-court-grad px-6 py-5 text-white sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="type-eyebrow block text-amber-200">Lindaville Phase 2 · Pickleball</span>
                <span className="font-display mt-0.5 block text-lg font-extrabold">Booking Reservation</span>
              </div>
              <span className="badge shrink-0 border-white/25 bg-white/15 text-white">Reserved</span>
            </div>

            {/* Booking reference */}
            <div className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-200">
                Booking Reference
              </div>
              <div className="font-display mt-0.5 select-all text-2xl font-extrabold tracking-wider">
                {reference}
              </div>
            </div>
          </div>

          {/* Ticket body */}
          <div className="px-6 py-5 sm:px-7">
            {/* Date */}
            <div className="mb-4">
              <div className="type-eyebrow mb-1 text-court-400">Date</div>
              <div className="font-display text-lg font-bold text-court-900">
                {formatDisplayDate(date)}
              </div>
            </div>

            <div className="my-4 border-t border-dashed border-court-100" />

            {/* Court(s) + time slot(s) */}
            <div className="mb-2">
              <div className="type-eyebrow mb-2 flex items-center justify-between text-court-400">
                <span>
                  {courtNames.length === 1 ? 'Court' : 'Courts'} &amp;{' '}
                  {slotCount === 1 ? 'Time Slot' : 'Time Slots'}
                </span>
                <span className="normal-case tracking-normal text-court-500">
                  {courtNames.length} {courtNames.length === 1 ? 'court' : 'courts'} · {slotCount}{' '}
                  {slotCount === 1 ? 'slot' : 'slots'}
                </span>
              </div>

              <ul className="divide-y divide-court-50 rounded-xl border border-court-100 bg-court-50/40">
                {items.map((item, i) => (
                  <li
                    key={`${item.courtName}-${item.startTime}-${i}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-court-900">{item.courtName}</div>
                      <div className="text-xs font-medium text-court-400">{item.period}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold tabular-nums text-court-800">
                        {formatTimeToAMPM(item.startTime)} – {formatTimeToAMPM(item.endTime)}
                      </div>
                      <div className="text-xs font-medium text-court-400">
                        {formatPeso(item.price)}/head
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="my-4 border-t border-dashed border-court-100" />

            {/* Total amount due */}
            <div className="rounded-xl bg-court-50 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="type-eyebrow text-court-400">Total Amount Due</div>
                  <div className="mt-0.5 text-xs font-medium text-court-500">
                    {formatPeso(perHeadSum)}/head total × {players}{' '}
                    {players === 1 ? 'player' : 'players'}
                  </div>
                </div>
                <div className="font-display text-3xl font-extrabold tabular-nums text-court-900">
                  {formatPeso(total)}
                </div>
              </div>
            </div>

            {/* Pay-on-site note */}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-semibold text-amber-700">
                Please pay on-site at the venue upon arrival.
              </p>
            </div>
          </div>
        </div>

        {/* Actions (outside the ticket) */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/my-bookings" className="btn btn-primary flex-1 justify-center px-6 py-3.5 text-base font-bold">
            View My Bookings
          </Link>
          <button
            type="button"
            onClick={onBookAnother}
            className="btn btn-ghost flex-1 justify-center px-6 py-3.5 text-base font-bold"
          >
            Book Another
          </button>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--ink-muted)' }}>
          Tip: take a screenshot of the reservation card above to keep your booking reference handy.
        </p>
      </div>
    </div>
  )
}
