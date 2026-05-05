import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import courtPhoto from '../assets/lindaph2.jpg'

const COURT_ID = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'

export default function CourtDetail() {
  const [court, setCourt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourt()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse-fast flex flex-col items-center gap-4 text-green-700">
          <div className="w-12 h-12 bg-yellow-400 rounded-full"></div>
          <p className="font-semibold">Loading court details...</p>
        </div>
      </div>
    )
  }

  if (!court) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-red-500 font-semibold">
        Court not found.
      </div>
    )
  }

  return (
    <div className="bg-gray-50">
      {/* Hero Section with Your Background Photo */}
      <div className="relative bg-green-800 text-white overflow-hidden min-h-[420px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${courtPhoto})`,
          }}
        ></div>

        <div className="absolute inset-0 bg-green-950/65"></div>

        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          <span className="inline-block bg-yellow-400 text-green-900 font-bold px-3 py-1 rounded-full text-sm mb-4 shadow-sm uppercase tracking-wide">
            Lindaville Phase 2
          </span>

          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight drop-shadow-md">
            {court.name}
          </h1>

          <p className="text-green-100 text-lg max-w-2xl mx-auto">
            Tagbilaran City, Bohol, Philippines
          </p>
        </div>
      </div>

      {/* Details & CTA Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 pb-12">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl border-t-4 border-yellow-400">
          <h2 className="text-2xl font-bold text-green-800 mb-3">About the Court</h2>
          <p className="text-gray-600 mb-8 text-lg leading-relaxed">
            {court.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/book"
              className="flex-1 bg-yellow-500 text-gray-900 font-extrabold text-center py-4 px-6 rounded-lg hover:bg-yellow-400 transition shadow-md hover:shadow-lg text-lg flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Book Now
            </Link>

            <Link
              to="/my-bookings"
              className="flex-1 bg-green-50 text-green-800 font-bold text-center py-4 px-6 rounded-lg hover:bg-green-100 transition border-2 border-green-200 text-lg flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              My Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}