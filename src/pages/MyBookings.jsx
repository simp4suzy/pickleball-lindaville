import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
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

function formatTimeToAMPM(timeStr) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export default function MyBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    if (user) fetchBookings()
  }, [user])

  async function fetchBookings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select(`id, date, status, time_slots ( start_time, end_time ), courts ( name )`)
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

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${colors[status]}`}>
        {status}
      </span>
    )
  }

  const BookingList = ({ title, list, isUpcoming }) => {
    if (list.length === 0) return null
    return (
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h2>
        <div className="space-y-4">
          {list.map((booking) => (
            <div key={booking.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 text-green-700 p-3 rounded-lg hidden sm:flex flex-col items-center justify-center border border-green-100">
                  <span className="text-xs font-bold uppercase">{new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, month: 'short' }).format(new Date(booking.date + 'T00:00:00'))}</span>
                  <span className="text-2xl font-extrabold">{new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, day: 'numeric' }).format(new Date(booking.date + 'T00:00:00'))}</span>
                </div>
                <div>
                  <p className="font-semibold text-green-800">{booking.courts.name}</p>
                  <p className="text-gray-500 text-sm">{formatDisplayDate(booking.date)}</p>
                  <p className="text-gray-900 font-medium mt-1">
                    {formatTimeToAMPM(booking.time_slots.start_time)} - {formatTimeToAMPM(booking.time_slots.end_time)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <StatusBadge status={booking.status} />
                {isUpcoming && (booking.status === 'pending' || booking.status === 'approved') && (
                  <button
                    onClick={() => handleCancel(booking.id)}
                    disabled={cancellingId === booking.id}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-wait hover:underline transition"
                  >
                    {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse-fast flex flex-col items-center gap-4 text-green-700">
          <div className="w-12 h-12 bg-yellow-400 rounded-full"></div>
          <p className="font-semibold">Loading your bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-green-800">My Bookings</h1>
          <Link to="/book" className="bg-green-600 text-white py-2.5 px-5 rounded-lg hover:bg-green-700 transition text-sm font-bold shadow-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New
          </Link>
        </div>

        {upcomingBookings.length === 0 && pastBookings.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-100">
            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Bookings Yet</h3>
            <p className="text-gray-500 mb-6">Ready to hit the court?</p>
            <Link to="/book" className="bg-yellow-500 text-gray-900 py-2 px-6 rounded-lg font-bold hover:bg-yellow-400 transition shadow-sm">
              Book a Time Slot
            </Link>
          </div>
        ) : (
          <>
            <BookingList title="Upcoming Bookings" list={upcomingBookings} isUpcoming={true} />
            <BookingList title="Past / Cancelled" list={pastBookings} isUpcoming={false} />
          </>
        )}
      </div>
    </div>
  )
}