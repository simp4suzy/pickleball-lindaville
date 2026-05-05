import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const COURT_ID = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'

function formatTimeToAMPM(timeStr) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('bookings')
  
  // State for bookings
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)

  // State for court info
  const [court, setCourt] = useState({})
  const [loadingCourt, setLoadingCourt] = useState(true)
  const [courtUpdateMsg, setCourtUpdateMsg] = useState('')

  // State for time slots
  const [timeSlots, setTimeSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [newStartTime, setNewStartTime] = useState('08:00')
  const [newEndTime, setNewEndTime] = useState('09:00')

  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings()
    if (activeTab === 'court') fetchCourt()
    if (activeTab === 'slots') fetchTimeSlots()
  }, [activeTab])

  // --- BOOKINGS LOGIC ---
  async function fetchBookings() {
    setLoadingBookings(true)
    const { data, error } = await supabase
      .from('bookings')
      .select(`id, date, status, time_slots ( start_time, end_time ), users_view ( email )`)
      .order('date', { ascending: false })
    
    if (error) console.error(error)
    else setBookings(data)
    setLoadingBookings(false)
  }

  async function updateBookingStatus(id, newStatus) {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    else fetchBookings() // Refresh list
  }

  // --- COURT LOGIC ---
  async function fetchCourt() {
    setLoadingCourt(true)
    const { data, error } = await supabase.from('courts').select('*').eq('id', COURT_ID).single()
    if (error) console.error(error)
    else setCourt(data)
    setLoadingCourt(false)
  }

  async function handleCourtUpdate(e) {
    e.preventDefault()
    setCourtUpdateMsg('')
    
    // Attempt to update the court
    const { data, error } = await supabase
      .from('courts')
      .update({ name: court.name, description: court.description })
      .eq('id', COURT_ID)
      .select() // .select() returns the updated row so we can verify it
    
    if (error) {
      console.error("Court Update Error:", error)
      setCourtUpdateMsg(`Error: ${error.message}`)
    } else {
      setCourtUpdateMsg('Court updated successfully! Go back to the Home page to see the changes.')
      console.log("Update successful:", data)
    }
  }

  // --- TIME SLOTS LOGIC ---
  async function fetchTimeSlots() {
    setLoadingSlots(true)
    const { data, error } = await supabase.from('time_slots').select('*').order('start_time', { ascending: true })
    if (error) console.error(error)
    else setTimeSlots(data)
    setLoadingSlots(false)
  }

  async function handleAddSlot(e) {
    e.preventDefault()
    const { error } = await supabase.from('time_slots').insert({ start_time: newStartTime, end_time: newEndTime })
    if (error) alert('Error adding slot: ' + error.message)
    else fetchTimeSlots()
  }

  async function handleDeleteSlot(id) {
    if (!window.confirm('Are you sure? Any bookings for this slot will also be deleted!')) return
    const { error } = await supabase.from('time_slots').delete().eq('id', id)
    if (error) alert('Error deleting slot: ' + error.message)
    else fetchTimeSlots()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-green-700 mb-6">Admin Panel</h1>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {['bookings', 'court', 'slots'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 font-medium capitalize transition ${activeTab === tab ? 'border-b-2 border-yellow-500 text-yellow-600' : 'text-gray-500 hover:text-green-600'}`}
            >
              {tab === 'slots' ? 'Time Slots' : tab}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">All Bookings</h2>
            {loadingBookings ? <p>Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-gray-600 text-sm">
                      <th className="py-2 px-2">User</th>
                      <th className="py-2 px-2">Date</th>
                      <th className="py-2 px-2">Time</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-sm">{b.users_view?.email || 'Unknown'}</td>
                        <td className="py-2 px-2 text-sm">{b.date}</td>
                        <td className="py-2 px-2 text-sm">{formatTimeToAMPM(b.time_slots.start_time)} - {formatTimeToAMPM(b.time_slots.end_time)}</td>
                        <td className="py-2 px-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                            b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            b.status === 'approved' ? 'bg-green-100 text-green-800' :
                            b.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>{b.status}</span>
                        </td>
                        <td className="py-2 px-2 text-sm space-x-2">
                          {b.status === 'pending' && (
                            <>
                              <button onClick={() => updateBookingStatus(b.id, 'approved')} className="text-green-600 hover:underline font-semibold">Approve</button>
                              <button onClick={() => updateBookingStatus(b.id, 'rejected')} className="text-red-600 hover:underline font-semibold">Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Court Info Tab */}
        {activeTab === 'court' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Edit Court Info</h2>
            {loadingCourt ? <p>Loading...</p> : (
              <form onSubmit={handleCourtUpdate} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Court Name</label>
                  <input 
                    type="text" value={court.name || ''} onChange={(e) => setCourt({...court, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Description</label>
                  <textarea 
                    rows="4" value={court.description || ''} onChange={(e) => setCourt({...court, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <button type="submit" className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 transition">Save Changes</button>
                {courtUpdateMsg && <p className={`text-sm font-semibold ${courtUpdateMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{courtUpdateMsg}</p>}
              </form>
            )}
          </div>
        )}

        {/* Time Slots Tab */}
        {activeTab === 'slots' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Manage Time Slots</h2>
            
            <form onSubmit={handleAddSlot} className="flex items-end gap-4 mb-6 bg-gray-50 p-4 rounded-md">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Start Time</label>
                <input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} required className="mt-1 px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">End Time</label>
                <input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} required className="mt-1 px-2 py-1 border rounded" />
              </div>
              <button type="submit" className="bg-green-600 text-white py-1 px-4 rounded hover:bg-green-700 transition">Add Slot</button>
            </form>

            {loadingSlots ? <p>Loading...</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {timeSlots.map((slot) => (
                  <div key={slot.id} className="border rounded p-3 flex justify-between items-center bg-gray-50">
                    <span className="font-medium text-sm">{formatTimeToAMPM(slot.start_time)} - {formatTimeToAMPM(slot.end_time)}</span>
                    <button onClick={() => handleDeleteSlot(slot.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">DELETE</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}