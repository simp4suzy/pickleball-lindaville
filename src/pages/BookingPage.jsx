import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

const COURT_ID = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'
const TIMEZONE = 'Asia/Manila'

function formatManilaDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatTimeToAMPM(timeStr) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export default function BookingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const todayManila = formatManilaDate(new Date())
  const [selectedDate, setSelectedDate] = useState(todayManila)
  const [timeSlots, setTimeSlots] = useState([])
  const [bookedSlotIds, setBookedSlotIds] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  // Fetch all time slots once
  useEffect(() => {
    async function fetchSlots() {
      const { data, error } = await supabase.from('time_slots').select('*').order('start_time', { ascending: true })
      if (error) console.error(error)
      else setTimeSlots(data)
    }
    fetchSlots()
  }, [])

  // Fetch existing bookings when date changes
  useEffect(() => {
    if (!selectedDate) return
    fetchBookingsForDate(selectedDate)
  }, [selectedDate])

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    // Create a Realtime channel to listen for changes on the bookings table
    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          // Whenever a booking is created, updated, or deleted, refresh the grid
          // so the user sees the most up-to-date availability instantly.
          console.log('Realtime change detected!', payload)
          fetchBookingsForDate(selectedDate)
        }
      )
      .subscribe()

    // Cleanup: Unsubscribe when leaving the page to prevent memory leaks
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDate]) // Re-run if the date changes so the fetch uses the correct date

  async function fetchBookingsForDate(date) {
    setLoading(true)
    setSelectedSlot(null)
    
    const { data, error } = await supabase
      .from('bookings')
      .select('time_slot_id')
      .eq('court_id', COURT_ID)
      .eq('date', date)
      .not('status', 'in', '("rejected","cancelled")')

    if (error) {
      console.error(error)
    } else {
      const ids = data.map((b) => b.time_slot_id)
      setBookedSlotIds(ids)
    }
    setLoading(false)
  }

  async function handleConfirmBooking() {
    if (!selectedSlot) return
    setSubmitting(true)
    setMessage(null)

    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      court_id: COURT_ID,
      date: selectedDate,
      time_slot_id: selectedSlot.id,
      status: 'pending',
    })

    if (error) {
      if (error.code === '23505') {
        setMessage('Error: This slot was just booked by someone else! Please pick another.')
        fetchBookingsForDate(selectedDate) // Immediately refresh grid
      } else {
        setMessage(`Error: ${error.message}`)
      }
    } else {
      setMessage('Booking successful! Redirecting...')
      setTimeout(() => navigate('/my-bookings'), 1500)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-green-700 mb-6 text-center">Book the Court</h1>
        
        {/* Date Picker Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-gray-700 font-semibold mb-2">1. Select a Date</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            min={todayManila} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Time Slot Grid Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-gray-700 font-semibold mb-4">2. Select a Time Slot</label>
          
          {loading ? (
            <p className="text-gray-500 text-center">Loading slots...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {timeSlots.map((slot) => {
                const isBooked = bookedSlotIds.includes(slot.id)
                const isSelected = selectedSlot?.id === slot.id

                return (
                  <button
                    key={slot.id}
                    disabled={isBooked}
                    onClick={() => setSelectedSlot(slot)}
                    className={`
                      p-3 rounded-md border-2 text-center font-medium transition
                      ${isBooked 
                        ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                        : isSelected 
                          ? 'bg-green-600 text-white border-green-600 shadow-md' 
                          : 'bg-white text-green-700 border-green-200 hover:border-green-500 hover:bg-green-50'
                      }
                    `}
                  >
                    <div className="text-sm">{formatTimeToAMPM(slot.start_time)}</div>
                    <div className="text-xs text-gray-500">to</div>
                    <div className="text-sm">{formatTimeToAMPM(slot.end_time)}</div>
                    {isBooked && <div className="text-xs mt-1 font-bold text-red-400">TAKEN</div>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Confirmation Section */}
        {selectedSlot && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg shadow-md mb-6">
            <h2 className="text-xl font-bold text-yellow-800 mb-3">3. Confirm Booking</h2>
            <div className="text-yellow-900 mb-4 space-y-1">
              <p><span className="font-semibold">Court:</span> Lindaville Phase 2 Multi-Purpose Hall</p>
              <p><span className="font-semibold">Date:</span> {selectedDate}</p>
              <p><span className="font-semibold">Time:</span> {formatTimeToAMPM(selectedSlot.start_time)} - {formatTimeToAMPM(selectedSlot.end_time)}</p>
            </div>
            
            {message && (
              <p className={`mb-4 text-sm font-semibold ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </p>
            )}

            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              className="w-full bg-yellow-500 text-gray-900 font-bold py-3 px-4 rounded-md hover:bg-yellow-600 transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Confirm & Book'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}