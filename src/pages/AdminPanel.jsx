import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const COURT_ID = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'

// Derive the same short, human-readable booking reference the customer sees on
// their confirmation ticket and in My Bookings. The full UUID stays the source
// of truth in the DB; this is the code the admin cross-checks against whatever
// the user shows on-site. Mirrors makeReference() in BookingPage/MyBookings.
function makeReference(uuid) {
  if (!uuid) return 'LV-XXXXXXXX'
  return `LV-${uuid.replace(/-/g, '').slice(0, 8).toUpperCase()}`
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
  if (Number.isNaN(n)) return '₱0'
  return n % 1 === 0 ? `₱${n.toLocaleString('en-PH')}` : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

// Build a local Date for a booking's end moment from its date (YYYY-MM-DD) and
// the slot's end_time (HH:MM or HH:MM:SS). Parsing the parts explicitly avoids
// timezone surprises from `new Date('2026-07-15 20:00')` across browsers.
function getBookingEndDate(booking) {
  const dateStr = booking?.date
  const endStr = booking?.time_slots?.end_time
  if (!dateStr || !endStr) return null
  const [y, mo, d] = dateStr.split('-').map((v) => parseInt(v, 10))
  const [h, mi, s] = endStr.split(':').map((v) => parseInt(v, 10))
  if ([y, mo, d, h, mi].some(Number.isNaN)) return null
  return new Date(y, mo - 1, d, h, mi, s || 0, 0)
}

// True when the booking's scheduled end time is at or before "now".
function hasBookingEnded(booking, now = new Date()) {
  const end = getBookingEndDate(booking)
  return end !== null && end.getTime() <= now.getTime()
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 flex-1" />
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('bookings')

  // State for bookings
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  // Tracks which booking row currently has an action in-flight, so we can
  // disable that row's buttons and show a spinner without blocking the rest.
  const [bookingActionId, setBookingActionId] = useState(null)

  // State for court info
  const [court, setCourt] = useState({})
  const [loadingCourt, setLoadingCourt] = useState(true)
  const [courtUpdateMsg, setCourtUpdateMsg] = useState('')

  // State for time slots
  const [timeSlots, setTimeSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [newStartTime, setNewStartTime] = useState('08:00')
  const [newEndTime, setNewEndTime] = useState('09:00')
  const [newPrice, setNewPrice] = useState('350')
  // Tracks in-progress inline price edits, keyed by slot id → draft string.
  const [priceDrafts, setPriceDrafts] = useState({})
  const [savingSlotId, setSavingSlotId] = useState(null)

  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings()
    if (activeTab === 'court') fetchCourt()
    if (activeTab === 'slots') fetchTimeSlots()
  }, [activeTab])

  // While the Bookings tab is open, re-check for expired "playing" bookings on
  // an interval so they auto-complete the moment their end time passes, even
  // without a manual refresh. fetchBookings() performs the actual flip.
  useEffect(() => {
    if (activeTab !== 'bookings') return
    const intervalId = setInterval(() => {
      fetchBookings()
    }, 60 * 1000) // every minute
    return () => clearInterval(intervalId)
  }, [activeTab])

  // --- BOOKINGS LOGIC ---
  async function fetchBookings() {
    setLoadingBookings(true)
    const { data, error } = await supabase
      .from('bookings')
      .select(`id, date, status, players, payment_status, paid_at, time_slots ( start_time, end_time, price ), courts ( name ), users_view ( email )`)
      .order('date', { ascending: false })

    if (error) {
      console.error(error)
      setLoadingBookings(false)
      return
    }

    // Auto-complete any booking whose scheduled end time has already passed.
    // A "playing" game that is past its end_time is over, so we flip it to
    // 'completed' server-side, then reflect it locally. This keeps the manual
    // Complete button as a fallback while making it unnecessary in the happy path.
    const now = new Date()
    const toComplete = (data || []).filter(
      (b) => b.status === 'playing' && hasBookingEnded(b, now)
    )

    if (toComplete.length > 0) {
      const ids = toComplete.map((b) => b.id)
      const { error: completeError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .in('id', ids)
      if (completeError) {
        console.error('Auto-complete failed:', completeError)
      } else {
        // Reflect the change locally so we do not need a second round-trip.
        const completedSet = new Set(ids)
        for (const b of data) {
          if (completedSet.has(b.id)) b.status = 'completed'
        }
      }
    }

    setBookings(data)
    setLoadingBookings(false)
  }

  // Generic booking-field updater with per-row loading + optimistic refresh.
  // `patch` is the set of columns to write (e.g. { status } or { payment_status }).
  async function updateBooking(id, patch) {
    setBookingActionId(id)
    const { error } = await supabase.from('bookings').update(patch).eq('id', id)
    setBookingActionId(null)
    if (error) alert('Error: ' + error.message)
    else fetchBookings() // Refresh list
  }

  function updateBookingStatus(id, newStatus) {
    return updateBooking(id, { status: newStatus })
  }

  // Confirm on-site payment: stamp payment_status + paid_at together.
  function confirmPaid(id) {
    return updateBooking(id, { payment_status: 'paid', paid_at: new Date().toISOString() })
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
      console.error('Court Update Error:', error)
      setCourtUpdateMsg(`Error: ${error.message}`)
    } else {
      setCourtUpdateMsg('Court updated successfully! Go back to the Home page to see the changes.')
      console.log('Update successful:', data)
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
    const priceValue = Number(newPrice)
    if (Number.isNaN(priceValue) || priceValue < 0) {
      alert('Please enter a valid price (0 or higher).')
      return
    }
    // Derive the period the grid groups by: Afternoon before 6 PM, else Evening.
    const period = newStartTime < '18:00' ? 'Afternoon' : 'Evening'
    const { error } = await supabase
      .from('time_slots')
      .insert({ start_time: newStartTime, end_time: newEndTime, price: priceValue, period })
    if (error) alert('Error adding slot: ' + error.message)
    else {
      setNewPrice('350')
      fetchTimeSlots()
    }
  }

  // Save an inline-edited price for a single slot back to Supabase.
  async function handleSavePrice(id) {
    const draft = priceDrafts[id]
    const priceValue = Number(draft)
    if (Number.isNaN(priceValue) || priceValue < 0) {
      alert('Please enter a valid price (0 or higher).')
      return
    }
    setSavingSlotId(id)
    const { error } = await supabase.from('time_slots').update({ price: priceValue }).eq('id', id)
    setSavingSlotId(null)
    if (error) {
      alert('Error updating price: ' + error.message)
    } else {
      // Clear the draft and refresh so the grid + admin list reflect the change.
      setPriceDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      fetchTimeSlots()
    }
  }

  async function handleDeleteSlot(id) {
    if (!window.confirm('Are you sure? Any bookings for this slot will also be deleted!')) return
    const { error } = await supabase.from('time_slots').delete().eq('id', id)
    if (error) alert('Error deleting slot: ' + error.message)
    else fetchTimeSlots()
  }

  return (
    <div className="min-h-screen bg-court-dots py-8 sm:py-10 px-4">
      <div className="max-w-5xl xl:max-w-6xl mx-auto">
        <span className="type-eyebrow text-amber-500 mb-1 block">Management</span>
        <h1 className="type-h1 text-court-700 text-3xl sm:text-4xl mb-6">Admin Panel</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto whitespace-nowrap p-1 bg-white rounded-2xl border border-court-100 shadow-card w-fit max-w-full">
          {['bookings', 'court', 'slots'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-selected={activeTab === tab}
              className={`focusable py-2.5 px-5 font-semibold capitalize transition-all duration-200 shrink-0 rounded-xl font-display ${
                activeTab === tab
                  ? 'bg-court-grad text-white shadow-sm'
                  : 'text-gray-500 hover:text-court-700 hover:bg-court-50'
              }`}
            >
              {tab === 'slots' ? 'Time Slots' : tab === 'court' ? 'Court Info' : 'Bookings'}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="card p-6">
            <h2 className="type-h2 mb-4">All Bookings</h2>
            {loadingBookings ? <TableSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="py-2.5 px-2 font-bold">Ref</th>
                      <th className="py-2.5 px-2 font-bold">User</th>
                      <th className="py-2.5 px-2 font-bold">Court</th>
                      <th className="py-2.5 px-2 font-bold">Date</th>
                      <th className="py-2.5 px-2 font-bold">Time</th>
                      <th className="py-2.5 px-2 font-bold">Players</th>
                      <th className="py-2.5 px-2 font-bold">Total</th>
                      <th className="py-2.5 px-2 font-bold">Payment</th>
                      <th className="py-2.5 px-2 font-bold">Status</th>
                      <th className="py-2.5 px-2 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100 hover:bg-green-50/40 transition-colors">
                        <td className="py-2.5 px-2 text-sm font-mono font-semibold tracking-wide text-court-700 whitespace-nowrap select-all">{makeReference(b.id)}</td>
                        <td className="py-2.5 px-2 text-sm">{b.users_view?.email || 'Unknown'}</td>
                        <td className="py-2.5 px-2 text-sm font-medium text-court-700">{b.courts?.name || '—'}</td>
                        <td className="py-2.5 px-2 text-sm">{b.date}</td>
                        <td className="py-2.5 px-2 text-sm">{formatTimeToAMPM(b.time_slots.start_time)} - {formatTimeToAMPM(b.time_slots.end_time)}</td>
                        <td className="py-2.5 px-2 text-sm">{b.players ?? 1}</td>
                        <td className="py-2.5 px-2 text-sm font-semibold text-court-700">
                          {formatPeso(Number(b.time_slots.price ?? 0) * (b.players ?? 1))}
                          <span className="ml-1 text-xs font-normal text-gray-400">
                            ({formatPeso(b.time_slots.price ?? 0)}/head)
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-sm">
                          <span className={`badge ${b.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                            {b.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-sm">
                          <span className={`badge ${
                            b.status === 'pending' ? 'badge-pending' :
                            b.status === 'approved' ? 'badge-approved' :
                            b.status === 'rejected' ? 'badge-rejected' :
                            b.status === 'playing' ? 'badge-playing' :
                            b.status === 'completed' ? 'badge-completed' :
                            b.status === 'reserved' ? 'badge-approved' :
                            'badge-cancelled'
                          }`}>{b.status}</span>
                        </td>
                        <td className="py-2.5 px-2 text-sm">
                          {(() => {
                            const busy = bookingActionId === b.id
                            const isTerminal = b.status === 'rejected' || b.status === 'cancelled' || b.status === 'completed'
                            const canConfirmPaid = b.payment_status !== 'paid' && !isTerminal
                            // Booking is "live" (occupies the court) once reserved/approved.
                            const canStartPlaying = (b.status === 'reserved' || b.status === 'approved') && !busy
                            const canComplete = b.status === 'playing' && !busy
                            return (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                {b.status === 'pending' && (
                                  <>
                                    <button disabled={busy} onClick={() => updateBookingStatus(b.id, 'approved')} className="link text-green-600 hover:text-green-800 disabled:opacity-40 disabled:cursor-not-allowed">Approve</button>
                                    <button disabled={busy} onClick={() => updateBookingStatus(b.id, 'rejected')} className="link text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed">Reject</button>
                                  </>
                                )}
                                {canConfirmPaid && (
                                  <button
                                    disabled={busy}
                                    onClick={() => confirmPaid(b.id)}
                                    aria-label={`Confirm payment received for ${b.users_view?.email || 'this booking'}`}
                                    className="link text-court-600 hover:text-court-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {busy ? 'Saving…' : 'Confirm Paid'}
                                  </button>
                                )}
                                {canStartPlaying && (
                                  <button
                                    disabled={busy}
                                    onClick={() => updateBookingStatus(b.id, 'playing')}
                                    aria-label={`Mark booking as currently playing for ${b.users_view?.email || 'this booking'}`}
                                    className="link text-emerald-600 hover:text-emerald-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {busy ? 'Saving…' : 'Start Playing'}
                                  </button>
                                )}
                                {canComplete && (
                                  <button
                                    disabled={busy}
                                    onClick={() => updateBookingStatus(b.id, 'completed')}
                                    aria-label={`Mark booking as completed for ${b.users_view?.email || 'this booking'}`}
                                    className="link text-slate-600 hover:text-slate-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {busy ? 'Saving…' : 'Complete'}
                                  </button>
                                )}
                                {/* When nothing is actionable, keep the cell from looking broken. */}
                                {!(b.status === 'pending') && !canConfirmPaid && !canStartPlaying && !canComplete && (
                                  <span className="text-gray-300">—</span>
                                )}
                              </div>
                            )
                          })()}
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
          <div className="card p-6">
            <h2 className="type-h2 mb-4">Edit Court Info</h2>
            {loadingCourt ? (
              <div className="space-y-4">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-11 w-full rounded-xl" />
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-24 w-full rounded-xl" />
                <div className="skeleton h-11 w-32 rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleCourtUpdate} className="space-y-4">
                <div>
                  <label className="field-label">Court Name</label>
                  <input
                    type="text" value={court.name || ''} onChange={(e) => setCourt({ ...court, name: e.target.value })}
                    className="field-input focusable"
                  />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <textarea
                    rows="4" value={court.description || ''} onChange={(e) => setCourt({ ...court, description: e.target.value })}
                    className="field-input focusable resize-y"
                  />
                </div>
                <button type="submit" className="btn btn-primary py-2.5 px-6">Save Changes</button>
                {courtUpdateMsg && <p className={`text-sm font-semibold ${courtUpdateMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{courtUpdateMsg}</p>}
              </form>
            )}
          </div>
        )}

        {/* Time Slots Tab */}
        {activeTab === 'slots' && (
          <div className="card p-6">
            <h2 className="type-h2 mb-4">Manage Time Slots</h2>
            <p className="-mt-2 mb-4 text-sm" style={{ color: 'var(--ink-muted)' }}>
              Prices are charged <span className="font-semibold text-court-700">per head</span> (per player). A booking&apos;s total is this rate × number of players.
            </p>

            <form onSubmit={handleAddSlot} className="flex flex-wrap items-end gap-3 sm:gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <label className="field-label">Start Time</label>
                <input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} required className="field-input focusable" />
              </div>
              <div>
                <label className="field-label">End Time</label>
                <input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} required className="field-input focusable" />
              </div>
              <div>
                <label className="field-label">Price (₱ / head)</label>
                <input
                  type="number" min="0" step="1" inputMode="numeric"
                  value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required
                  className="field-input focusable w-28"
                />
              </div>
              <button type="submit" className="btn btn-primary py-2.5 px-5">Add Slot</button>
            </form>

            {loadingSlots ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {timeSlots.map((slot) => {
                  const draft = priceDrafts[slot.id]
                  const isEditing = draft !== undefined
                  const isSaving = savingSlotId === slot.id
                  return (
                    <div key={slot.id} className="card card-hover p-3.5 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-sm">{formatTimeToAMPM(slot.start_time)} - {formatTimeToAMPM(slot.end_time)}</span>
                        <button onClick={() => handleDeleteSlot(slot.id)} className="link text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wide">Delete</button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <span className="text-sm font-bold text-court-600">₱</span>
                            <input
                              type="number" min="0" step="1" inputMode="numeric" autoFocus
                              value={draft}
                              onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePrice(slot.id) }}
                              className="field-input focusable h-9 w-24 py-1"
                            />
                            <button
                              onClick={() => handleSavePrice(slot.id)}
                              disabled={isSaving}
                              className="btn btn-primary py-1.5 px-3 text-xs disabled:opacity-60"
                            >
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => setPriceDrafts((prev) => { const n = { ...prev }; delete n[slot.id]; return n })}
                              className="link text-gray-500 hover:text-gray-700 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-bold text-amber-500">{formatPeso(slot.price)}<span className="text-xs font-semibold text-gray-400">/head</span></span>
                            <button
                              onClick={() => setPriceDrafts((prev) => ({ ...prev, [slot.id]: String(slot.price ?? '') }))}
                              className="link text-court-600 hover:text-court-800 text-xs font-bold uppercase tracking-wide"
                            >
                              Edit price
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
