import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import courtPhoto from '../assets/lindaph2.jpg'
import AnnouncementsBoard from '../components/AnnouncementsBoard'

const COURT_ID = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'

/* Small inline icon set (Lucide-style strokes) */
const Icon = {
  Calendar: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Ticket: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  Bolt: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  Navigation: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  ),
  External: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><path d="M15 3h6v6" /><path d="M10 14L21 3" />
    </svg>
  ),
  Car: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 17H3v-4l2-5h10l4 5v4h-2" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  ),
}

/* Google Maps: shared coordinates for the Lindaville Multi-Purpose Hall */
const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3933.0387692252584!2d123.87314822569512!3d9.677728578495742!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33aa4c05613818f1%3A0x496bf49c85d6e7c5!2sLindaville%20Subdivision%20Phase%202%2C%20Multi-Purpose%20Hall!5e0!3m2!1sen!2sph!4v1784098006117!5m2!1sen!2sph'
const MAP_DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=Lindaville+Subdivision+Phase+2+Multi-Purpose+Hall&destination_place_id=ChIJ8Rg4YQVMqjMRxefWhZz0a0k'
const MAP_VIEW_URL =
  'https://www.google.com/maps/search/?api=1&query=Lindaville+Subdivision+Phase+2+Multi-Purpose+Hall&query_place_id=ChIJ8Rg4YQVMqjMRxefWhZz0a0k'

const HIGHLIGHTS = [
  { icon: Icon.Clock, label: 'Flexible time slots' },
  { icon: Icon.Bolt, label: 'Real-time availability' },
  { icon: Icon.Check, label: 'Instant confirmation' },
]

const QUICK_INFO = [
  { icon: Icon.Pin, title: 'Location', lines: ['Lindaville Phase 2', 'Multi-Purpose Hall, Bohol'] },
  { icon: Icon.Clock, title: 'Time zone', lines: ['Asia / Manila (PHT)', 'Slots shown in local time'] },
  { icon: Icon.Bolt, title: 'Booking', lines: ['Reserve in seconds', 'Admin-approved slots'] },
]

export default function CourtDetail() {
  const [court, setCourt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCourt() {
      setLoading(true)
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('id', COURT_ID)
        .single()

      if (error) console.error('Error fetching court:', error)
      else setCourt(data)

      setLoading(false)
    }
    fetchCourt()
  }, [])

  if (loading) {
    return (
      <div>
        {/* Hero skeleton */}
        <div className="relative bg-court-900 overflow-hidden min-h-[420px] sm:min-h-[500px] lg:min-h-[560px] flex items-center justify-center">
          <div className="w-full max-w-4xl xl:max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-4">
            <div className="skeleton h-6 w-40 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }} />
            <div className="skeleton h-14 sm:h-20 w-3/4" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }} />
            <div className="skeleton h-5 w-1/2" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
          </div>
        </div>
        {/* Card skeleton */}
        <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 -mt-12 relative z-10 pb-16">
          <div className="card card-accent p-6 sm:p-9 lg:p-11">
            <div className="skeleton h-7 w-52 mb-4" />
            <div className="space-y-3 mb-8">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-4/5" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="skeleton h-14 flex-1 rounded-xl" />
              <div className="skeleton h-14 flex-1 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!court) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card card-accent p-8 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Icon.Pin width={26} height={26} />
          </div>
          <p className="type-h2 text-red-600 mb-1">Court not found</p>
          <p className="type-body">Please check back later or contact the admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[440px] sm:min-h-[520px] lg:min-h-[580px] flex items-center">
        {/* Photo */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${courtPhoto})` }}
        />
        {/* Layered brand gradient overlay for depth + contrast */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(120deg, rgba(8,25,16,0.92) 0%, rgba(15,45,26,0.78) 45%, rgba(20,56,31,0.55) 100%)',
          }}
        />
        {/* Amber glow accent */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #f0b429 0%, transparent 70%)' }}
        />

        <div className="relative w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <span className="badge bg-amber-grad text-court-900 border-transparent shadow-amber mb-5">
            <Icon.Pin width={13} height={13} /> Lindaville Phase 2
          </span>

          <h1 className="type-display text-white text-4xl sm:text-6xl lg:text-7xl mb-4 max-w-3xl text-balance drop-shadow-lg">
            Lindaville Ace Paddlers
          </h1>

          <p className="text-court-100/90 text-base sm:text-xl max-w-xl leading-relaxed mb-8">
            Your neighborhood pickleball court in Tagbilaran City, Bohol —
            reserve your game in just a few taps.
          </p>

          <div className="flex flex-wrap gap-3 mb-9">
            {HIGHLIGHTS.map(({ icon: I, label }) => (
              <span key={label} className="chip">
                <I width={16} height={16} className="text-amber-300" />
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md">
            <Link to="/book" className="btn btn-amber flex-1 py-4 px-6 text-base font-extrabold">
              <Icon.Calendar width={22} height={22} />
              Book Now
            </Link>
            <Link to="/my-bookings" className="btn glass flex-1 py-4 px-6 text-base text-white rounded-xl font-semibold">
              <Icon.Ticket width={22} height={22} />
              My Bookings
            </Link>
          </div>
        </div>
      </section>

      {/* ── About + Quick info ───────────────────────────────────────── */}
      <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 -mt-12 relative z-10 pb-14 lg:pb-16">
        <div className="card card-accent card-hover p-6 sm:p-9 lg:p-11">
          <span className="type-eyebrow text-amber-500 mb-2 block">About the court</span>
          <h2 className="type-h2 text-court-700 mb-3 text-2xl">Everything you need for a great game</h2>
          <p className="type-body text-lg mb-8 max-w-2xl">
            {court.description}
          </p>

          {/* Quick info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {QUICK_INFO.map(({ icon: I, title, lines }) => (
              <div
                key={title}
                className="rounded-2xl border border-court-100 bg-court-50/60 p-4 flex items-start gap-3"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white text-court-600 border border-court-100 shrink-0">
                  <I width={20} height={20} />
                </span>
                <div className="min-w-0">
                  <p className="type-eyebrow text-court-600 mb-1">{title}</p>
                  {lines.map((l) => (
                    <p key={l} className="text-sm text-ink-soft leading-snug" style={{ color: 'var(--ink-soft)' }}>{l}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link to="/book" className="btn btn-amber flex-1 py-4 px-6 text-base font-extrabold">
              <Icon.Calendar width={22} height={22} />
              Book a Time Slot
            </Link>
            <Link to="/my-bookings" className="btn btn-ghost flex-1 py-4 px-6 text-base">
              <Icon.Ticket width={22} height={22} />
              View My Bookings
            </Link>
          </div>
        </div>
      </div>

      {/* ── Location & directions ────────────────────────────────────── */}
      <section className="bg-court-dots border-t border-court-100/70">
        <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-14 lg:py-20">
          {/* Section header */}
          <div className="max-w-2xl mb-8 lg:mb-10">
            <span className="type-eyebrow text-amber-500 mb-2 block">Find us</span>
            <h2 className="type-h1 text-court-700 text-3xl sm:text-4xl mb-3">
              Getting to the court
            </h2>
            <p className="type-body text-lg">
              We&apos;re at the Multi-Purpose Hall inside Lindaville Subdivision Phase 2 in
              Tagbilaran City, Bohol. Use the map below to preview the area or tap
              <span className="font-semibold text-court-600"> Get directions </span>
              for turn-by-turn navigation.
            </p>
          </div>

          {/* Map + info grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-stretch">
            {/* Interactive map */}
            <div className="lg:col-span-3 card card-accent card-hover overflow-hidden p-0">
              <div className="relative w-full aspect-[16/11] sm:aspect-[16/9] bg-court-50">
                <iframe
                  title="Map showing Lindaville Subdivision Phase 2, Multi-Purpose Hall in Tagbilaran City, Bohol"
                  src={MAP_EMBED_SRC}
                  className="absolute inset-0 h-full w-full border-0"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>

            {/* Details panel */}
            <div className="lg:col-span-2 card card-hover p-6 sm:p-7 flex flex-col">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-court-50 text-court-600 border border-court-100 mb-4">
                <Icon.Pin width={24} height={24} />
              </span>

              <h3 className="type-h2 text-court-700 text-xl mb-1">Lindaville Pickleball Court</h3>
              <address className="not-italic type-body text-[15px] leading-relaxed mb-5">
                Multi-Purpose Hall, Lindaville Subdivision Phase 2<br />
                Tagbilaran City, Bohol<br />
                Philippines
              </address>

              {/* Micro facts */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-court-50 text-court-600 border border-court-100 shrink-0">
                    <Icon.Car width={18} height={18} />
                  </span>
                  <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                    On-site parking around the hall
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-court-50 text-court-600 border border-court-100 shrink-0">
                    <Icon.Clock width={18} height={18} />
                  </span>
                  <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                    Open per your approved booking slot
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-auto flex flex-col gap-3">
                <a
                  href={MAP_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-amber w-full py-3.5 px-5 text-base font-extrabold"
                >
                  <Icon.Navigation width={20} height={20} />
                  Get Directions
                </a>
                <a
                  href={MAP_VIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost w-full py-3.5 px-5 text-base"
                >
                  <Icon.External width={18} height={18} />
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements feed (authenticated players only) */}
      <AnnouncementsBoard />
    </div>
  )
}
