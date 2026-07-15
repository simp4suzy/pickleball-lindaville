import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { toBlob } from 'html-to-image'
import { useAuth } from '../context/authContextStore'
import { supabase } from '../lib/supabaseClient'
import { lockBodyScroll } from '../lib/scrollLock'
import { Link } from 'react-router-dom'

const TIMEZONE = 'Asia/Manila'

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Long, ticket-style date (matches BookingConfirmation).
function formatFullDate(dateStr) {
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
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

function formatPeso(amount) {
  const n = Number(amount)
  if (Number.isNaN(n)) return 'Ã¢â€šÂ±0'
  return n % 1 === 0 ? `Ã¢â€šÂ±${n.toLocaleString('en-PH')}` : `Ã¢â€šÂ±${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

// Derive the same short, human-readable booking reference the confirmation
// screen shows. The full UUID stays the source of truth in the DB; this is the
// customer-facing code to quote on-site. Mirrors makeReference() in BookingPage.
function makeReference(uuid) {
  if (!uuid) return 'LV-XXXXXXXX'
  return `LV-${uuid.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

// Detect restricted in-app browsers (webviews) that render pages but block
// normal "save file" behavior: Facebook Messenger, Facebook, Instagram,
// Threads, TikTok, Line, and similar. These webviews ignore the <a download>
// attribute and frequently refuse navigator.share({ files }), so the ONLY
// reliable "save image" path is long-pressing an <img> on the page. We use
// this to route straight to the inline-image fallback instead of silently
// failing on a download that never happens.
function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase()
  // FBAN/FBAV = Facebook app, FB_IAB/Messenger = Messenger, plus common others.
  return /(fban|fbav|fb_iab|fbios|messenger|instagram|line|tiktok|musical_ly|threads|micromessenger|snapchat)/.test(
    ua,
  )
}

function StatusBadge({ status }) {
  const cls = {
    reserved: 'badge-approved',
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    cancelled: 'badge-cancelled',
  }
  return <span className={`badge ${cls[status] || 'badge-cancelled'}`}>{status}</span>
}

/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
   BookingTicket
   ----------------------------------------------------------------------
   A screenshot-ready reservation summary for a SINGLE booking, matching the
   post-booking BookingConfirmation card. Rendered inside a modal so a user
   can pull up the exact same "e-ticket" anytime without rebooking:

     Ã¢â‚¬Â¢ Booking reference ID (LV-XXXXXXXX)
     Ã¢â‚¬Â¢ Court reserved
     Ã¢â‚¬Â¢ Date
     Ã¢â‚¬Â¢ Time slot
     Ã¢â‚¬Â¢ Total amount due (per-head rate Ãƒâ€” players)
     Ã¢â‚¬Â¢ Pay-on-site note

   A phone screenshot of just this card is a complete, self-explanatory ticket.
   Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */
function BookingTicket({ booking }) {
  const reference = makeReference(booking.id)
  const players = booking.players ?? 1
  const price = Number(booking.time_slots.price ?? 0)
  const total = price * players
  const courtName = booking.courts.name
  const cancelled = booking.status === 'cancelled' || booking.status === 'rejected'

  return (
    <div className={`card overflow-hidden p-0 ${cancelled ? 'opacity-90' : ''}`}>
      {/* Ticket header */}
      <div className="bg-court-grad px-6 py-5 text-white sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="type-eyebrow block text-amber-200">Lindaville Phase 2 Ã‚Â· Pickleball</span>
            <span className="font-display mt-0.5 block text-lg font-extrabold">Booking Reservation</span>
          </div>
          <span className="badge shrink-0 border-white/25 bg-white/15 capitalize text-white">{booking.status}</span>
        </div>

        {/* Booking reference */}
        <div className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-200">Booking Reference</div>
          <div className="font-display mt-0.5 select-all text-2xl font-extrabold tracking-wider">{reference}</div>
        </div>
      </div>

      {/* Ticket body */}
      <div className="px-6 py-5 sm:px-7">
        {/* Date */}
        <div className="mb-4">
          <div className="type-eyebrow mb-1 text-court-400">Date</div>
          <div className="font-display text-lg font-bold text-court-900">{formatFullDate(booking.date)}</div>
        </div>

        <div className="my-4 border-t border-dashed border-court-100" />

        {/* Court + time slot */}
        <div className="mb-2">
          <div className="type-eyebrow mb-2 text-court-400">Court &amp; Time Slot</div>
          <div className="rounded-xl border border-court-100 bg-court-50/40">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-semibold text-court-900">{courtName}</div>
                <div className="text-xs font-medium text-court-400">{booking.time_slots.period}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold tabular-nums text-court-800">
                  {formatTimeToAMPM(booking.time_slots.start_time)} Ã¢â‚¬â€œ {formatTimeToAMPM(booking.time_slots.end_time)}
                </div>
                <div className="text-xs font-medium text-court-400">{formatPeso(price)}/head</div>
              </div>
            </div>
          </div>
        </div>

        <div className="my-4 border-t border-dashed border-court-100" />

        {/* Total amount due */}
        <div className="rounded-xl bg-court-50 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="type-eyebrow text-court-400">Total Amount Due</div>
              <div className="mt-0.5 text-xs font-medium text-court-500">
                {formatPeso(price)}/head Ãƒâ€” {players} {players === 1 ? 'player' : 'players'}
              </div>
            </div>
            <div className="font-display text-3xl font-extrabold tabular-nums text-court-900">{formatPeso(total)}</div>
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
          <p className="text-sm font-semibold text-amber-700">Please pay on-site at the venue upon arrival.</p>
        </div>

        {cancelled && (
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-widest text-red-500">
            This reservation was {booking.status}
          </p>
        )}
      </div>
    </div>
  )
}

/* Modal wrapper that re-opens the screenshot-ready ticket for a booking. */
function TicketModal({ booking, onClose }) {
  // Node we rasterize when the user taps "Save as image".
  const ticketRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  // When an automatic save path isn't available (restricted in-app browsers
  // such as Messenger/Instagram/Facebook that ignore <a download> and often
  // block navigator.share of files), we surface the generated PNG inline so the
  // user can long-press / right-click -> "Save Image". This is the universal
  // fallback that works on every device and browser.
  const [savedImageUrl, setSavedImageUrl] = useState('')

  // Keep the latest onClose in a ref so the effect below can run exactly ONCE
  // (on mount) and clean up exactly once (on unmount). MyBookings recreates
  // `onClose` (`() => setTicketBooking(null)`) on every render, so depending on
  // it would tear down / re-run this effect on unrelated parent re-renders.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Close on Escape, and lock background scroll via the shared, reference-counted
  // lock so this modal and the mobile nav drawer never clobber each other's
  // `document.body.style.overflow` (the root cause of the stuck-scroll bug).
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    const releaseScroll = lockBodyScroll()
    return () => {
      document.removeEventListener('keydown', onKey)
      releaseScroll()
    }
  }, [])

  // Release any inline preview object URL when the modal unmounts so we don't
  // leak the (potentially several-MB) blob.
  useEffect(() => {
    return () => {
      if (savedImageUrl) URL.revokeObjectURL(savedImageUrl)
    }
  }, [savedImageUrl])

  // Render the ticket card to a high-resolution PNG and save it.
  //
  // Cross-device strategy. There is no single API that "saves an image" on
  // every platform, so we try the best path for each environment and always
  // end with a universal fallback that works even inside locked-down in-app
  // browsers (Facebook Messenger / Instagram / Facebook webviews):
  //
  //   1. navigator.share({ files })  -> native share sheet (modern mobile
  //      browsers). This is where users tap "Save Image".
  //   2. <a download> via a blob object URL -> real file download
  //      (desktop browsers, Android Chrome).
  //   3. Inline the PNG in the modal -> the user long-presses / right-clicks
  //      the image and picks "Save Image". This ALWAYS works, including in
  //      Messenger's in-app browser which ignores `download` and frequently
  //      refuses navigator.share of files.
  //
  // The previous code stopped at step 2. In the Messenger webview step 1
  // either wasn't offered or threw, and step 2 was silently ignored (the
  // `download` attribute is not honored there), so nothing happened at all.
  const handleDownload = useCallback(async () => {
    if (!ticketRef.current || downloading) return
    setDownloading(true)
    setDownloadError('')
    // Clear any previous inline preview so repeated taps stay tidy.
    setSavedImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })

    try {
      // Produce a real PNG Blob (not a giant data URL).
      const blob = await toBlob(ticketRef.current, {
        // 2x for a crisp, retina-quality image; solid bg so no transparency.
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      })
      if (!blob) throw new Error('Image generation returned an empty blob.')

      const fileName = `booking-${makeReference(booking.id)}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      // 1) Preferred on mobile browsers: native share sheet with the image
      //    file. canShare guards devices that support share() but not files.
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: 'Booking Reservation',
            text: `Lindaville Phase 2 - Pickleball - ${makeReference(booking.id)}`,
          })
          // Shared successfully - done.
          return
        } catch (shareErr) {
          // User dismissed the share sheet: stop quietly, nothing went wrong.
          if (shareErr && shareErr.name === 'AbortError') return
          // Any other error (in-app webviews often throw NotAllowedError /
          // DataError here) -> fall through to the download / inline fallback.
        }
      }

      // 2) Desktop / Android Chrome: trigger a real file download via a blob
      //    object URL. We detect whether the browser actually honors the
      //    `download` attribute; in-app browsers (Messenger/IG/FB) do not, so
      //    we skip straight to the inline fallback there instead of doing
      //    nothing.
      const testLink = document.createElement('a')
      const supportsDownloadAttr = 'download' in testLink && !isInAppBrowser()

      if (supportsDownloadAttr) {
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = fileName
        link.href = objectUrl
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
        return
      }

      // 3) Universal fallback (restricted in-app browsers such as Messenger):
      //    show the PNG inline so the user can long-press / right-click and
      //    choose "Save Image". This is the path that finally makes saving
      //    work inside Messenger's in-app browser.
      const previewUrl = URL.createObjectURL(blob)
      setSavedImageUrl(previewUrl)
      setDownloadError(
        isInAppBrowser()
          ? 'Tip: press and hold the image below, then tap "Save Image". (Facebook Messenger blocks automatic downloads - opening this link in Chrome or Safari also works.)'
          : 'Press and hold (or right-click) the image below, then choose "Save Image".',
      )
    } catch (err) {
      console.error('Could not generate ticket image:', err)
      setDownloadError(
        'Could not save the image automatically. Please take a screenshot of the ticket instead.',
      )
    } finally {
      setDownloading(false)
    }
  }, [booking.id, downloading])

  if (!booking) return null

  /*
    Why a portal?
    ------------------------------------------------------------------
    This modal uses `position: fixed`, which should be positioned relative
    to the viewport. But an ancestor route wrapper (<div className="page-transition">)
    keeps `transform: translateY(0)` after its enter animation finishes
    (keyframes use fill-mode: both). ANY non-`none` transform turns that
    ancestor into the containing block for fixed descendants, so the modal
    was being positioned/sized relative to the full-height page div instead
    of the viewport. After scrolling down, the h-dvh scroll region ended up
    off-screen -- hence "can't scroll up or down" when opening View lower on
    the page. Rendering into document.body escapes that transformed ancestor,
    so `fixed` + `inset-0` + `h-dvh` are once again viewport-relative and the
    modal scrolls correctly no matter how far the page is scrolled.
  */
  return createPortal(
    <div
      /*
        z-[100] keeps the whole dialog ABOVE the sticky app header (z-50), so the
        header can never paint over the ticket or swallow touch/scroll gestures
        that start near the top of the screen Ã¢â‚¬â€ the original scroll bug.
      */
      className="fixed inset-0 z-[100] flex items-stretch justify-center overflow-hidden bg-court-900/70 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Booking reservation ticket"
      onClick={onClose}
    >
      {/*
        Bounded flex column constrained to the visible viewport with h-dvh
        (dvh excludes mobile browser chrome). Padding lives INSIDE the height
        bound, plus safe-area insets so nothing hides behind the notch or home
        bar. The header/footer bars stay pinned (shrink-0); only the middle
        region scrolls, so the close + download controls are always reachable.
      */}
      <div
        className="fade-in-up flex h-dvh w-full max-w-xl flex-col px-3 pb-3 sm:h-auto sm:max-h-[92dvh] sm:px-6 sm:pb-6"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white/90">Present this at the venue</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket"
            className="focusable flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/*
          The ONLY scroll region. min-h-0 lets it shrink inside the flex column
          so it never pushes the parent past the viewport. overscroll-contain +
          touch-action:pan-y guarantee reliable vertical panning on mobile even
          when a gesture starts on the card itself.
        */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {/* ref target: only the card is captured in the downloaded image. */}
          <div ref={ticketRef}>
            <BookingTicket booking={booking} />
          </div>

          <p className="mt-4 text-center text-xs text-white/70">
            Scroll to view the full ticket, then save it as an image or take a screenshot.
          </p>
        </div>

        {/* Pinned action bar Ã¢â‚¬â€ always visible so downloading never requires scrolling. */}
        <div className="mt-3 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-amber w-full py-3 text-sm font-extrabold disabled:cursor-wait"
          >
            {downloading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Preparing imageÃ¢â‚¬Â¦
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Save image
              </>
            )}
          </button>
          {downloadError && (
            <p className="mt-2 text-center text-xs font-semibold text-amber-300" role="alert">
              {downloadError}
            </p>
          )}
          {savedImageUrl && (
            <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-2">
              <p className="mb-2 text-center text-[11px] font-semibold text-white/80">
                Press and hold this image, then tap &ldquo;Save Image&rdquo;.
              </p>
              <img
                src={savedImageUrl}
                alt="Your booking ticket. Press and hold to save it."
                className="mx-auto block w-full max-w-xs rounded-lg"
                style={{ WebkitTouchCallout: 'default', touchAction: 'manipulation' }}
              />
              <a
                href={savedImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-[11px] font-semibold text-amber-300 underline"
              >
                Or open the image in a new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function BookingList({ title, list, isUpcoming, cancellingId, onCancel, onView }) {
  if (list.length === 0) return null
  return (
    <div className="mb-10">
      <h2 className="type-h2 text-court-700 mb-4 flex items-center gap-2.5">
        <span className="inline-block w-1.5 h-5 rounded-full bg-amber-grad" />
        {title}
        <span className="text-sm font-semibold rounded-full bg-court-50 text-court-600 px-2.5 py-0.5 border border-court-100">{list.length}</span>
      </h2>
      <div className="space-y-4">
        {list.map((booking, i) => {
          const players = booking.players ?? 1
          const price = Number(booking.time_slots.price ?? 0)
          const reference = makeReference(booking.id)
          const canCancel = isUpcoming && (booking.status === 'reserved' || booking.status === 'pending' || booking.status === 'approved')
          return (
            <div
              key={booking.id}
              className="card card-hover fade-in-up p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="bg-court-grad text-white p-3 rounded-2xl hidden sm:flex flex-col items-center justify-center min-w-[58px] shadow-card">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200">{new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, month: 'short' }).format(new Date(booking.date + 'T00:00:00'))}</span>
                  <span className="text-2xl font-extrabold leading-none font-display">{new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, day: 'numeric' }).format(new Date(booking.date + 'T00:00:00'))}</span>
                </div>
                <div>
                  {/* Booking reference Ã¢â‚¬â€ the same code shown on the confirmation ticket */}
                  <p className="font-display text-[11px] font-bold uppercase tracking-widest text-amber-500 select-all">
                    Ref {reference}
                  </p>
                  <p className="font-bold text-court-700 font-display">{booking.courts.name}</p>
                  <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>{formatDisplayDate(booking.date)}</p>
                  <p className="font-semibold mt-1" style={{ color: 'var(--ink)' }}>
                    {formatTimeToAMPM(booking.time_slots.start_time)} Ã¢â‚¬â€œ {formatTimeToAMPM(booking.time_slots.end_time)}
                  </p>
                  <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-muted)' }}>
                    <span className="font-semibold text-court-700">{formatPeso(price * players)}</span>
                    <span className="mx-1.5 text-court-300">Ã‚Â·</span>
                    {players} {players === 1 ? 'player' : 'players'}
                    <span className="text-court-400"> ({formatPeso(price)}/head)</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <StatusBadge status={booking.status} />
                <button
                  onClick={() => onView(booking)}
                  className="btn btn-ghost text-sm py-2 px-3.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
                {canCancel && (
                  <button
                    onClick={() => onCancel(booking.id)}
                    disabled={cancellingId === booking.id}
                    className="link text-red-500 hover:text-red-700 text-sm disabled:opacity-50 disabled:cursor-wait px-1"
                  >
                    {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BookingsSkeleton() {
  return (
    <div className="min-h-screen bg-court-dots py-8 sm:py-12 px-4">
      <div className="max-w-3xl xl:max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="skeleton h-9 w-48" />
          <div className="skeleton h-10 w-20 rounded-xl" />
        </div>
        <div className="skeleton h-6 w-40 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 flex justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="skeleton h-14 w-14 rounded-xl hidden sm:block" />
                <div className="space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-4 w-32" />
                </div>
              </div>
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MyBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  // The booking whose screenshot-ready ticket is currently open (or null).
  const [ticketBooking, setTicketBooking] = useState(null)

  useEffect(() => {
    if (user) fetchBookings()
    // fetchBookings only reads `user`, which is already in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchBookings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select(`id, date, status, players, time_slots ( start_time, end_time, price, period ), courts ( name )`)
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    if (error) console.error('Error fetching bookings:', error)
    else setBookings(data)
    setLoading(false)
  }

  async function handleCancel(bookingId) {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return

    setCancellingId(bookingId)
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)

    if (error) alert('Error cancelling booking: ' + error.message)
    else await fetchBookings()
    setCancellingId(null)
  }

  const nowInManila = new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }))
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowInManila)
  const currentTimeStr = `${String(nowInManila.getHours()).padStart(2, '0')}:${String(nowInManila.getMinutes()).padStart(2, '0')}:00`

  const upcomingBookings = bookings.filter((b) => {
    if (b.status === 'cancelled' || b.status === 'rejected') return false
    return b.date > todayStr || (b.date === todayStr && b.time_slots.end_time >= currentTimeStr)
  })

  const pastBookings = bookings.filter((b) => {
    if (b.status === 'cancelled' || b.status === 'rejected') return true
    return b.date < todayStr || (b.date === todayStr && b.time_slots.end_time < currentTimeStr)
  })

  if (loading) {
    return <BookingsSkeleton />
  }

  return (
    <div className="min-h-screen bg-court-dots py-8 sm:py-12 px-4">
      <div className="max-w-3xl xl:max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 sm:mb-10">
          <div>
            <span className="type-eyebrow text-amber-500 mb-1 block">Your reservations</span>
            <h1 className="type-h1 text-court-700 text-3xl sm:text-4xl">My Bookings</h1>
          </div>
          <Link to="/book" className="btn btn-primary py-3 px-5 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Booking
          </Link>
        </div>

        {upcomingBookings.length === 0 && pastBookings.length === 0 ? (
          <div className="card card-accent p-10 sm:p-12 text-center">
            <div className="w-16 h-16 bg-amber-grad rounded-2xl flex items-center justify-center mx-auto mb-5 text-court-900 shadow-amber">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="type-h2 text-court-700 mb-2 text-xl">No bookings yet</h3>
            <p className="type-body mb-6 max-w-xs mx-auto">Ready to hit the court? Reserve your first time slot in seconds.</p>
            <Link to="/book" className="btn btn-amber py-3 px-7 font-extrabold">
              Book a Time Slot
            </Link>
          </div>
        ) : (
          <>
            <BookingList title="Upcoming Bookings" list={upcomingBookings} isUpcoming={true} cancellingId={cancellingId} onCancel={handleCancel} onView={setTicketBooking} />
            <BookingList title="Past / Cancelled" list={pastBookings} isUpcoming={false} cancellingId={cancellingId} onCancel={handleCancel} onView={setTicketBooking} />
          </>
        )}
      </div>

      {ticketBooking && <TicketModal booking={ticketBooking} onClose={() => setTicketBooking(null)} />}
    </div>
  )
}