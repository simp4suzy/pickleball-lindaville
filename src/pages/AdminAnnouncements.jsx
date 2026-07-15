import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/authContextStore'

function formatDateTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      ))}
    </div>
  )
}

export default function AdminAnnouncements() {
  const { user } = useAuth()

  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchAnnouncements = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching announcements:', error)
    else setAnnouncements(data || [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnnouncements()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setSubmitting(true)
    setMsg('')

    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      body: body.trim(),
      created_by: user?.id ?? null,
      is_active: true,
    })

    if (error) {
      console.error('Create announcement error:', error)
      setMsg(`Error: ${error.message}`)
    } else {
      setTitle('')
      setBody('')
      setMsg('Announcement posted successfully!')
      fetchAnnouncements()
    }
    setSubmitting(false)
  }

  async function toggleActive(a) {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !a.is_active })
      .eq('id', a.id)

    if (error) alert('Error: ' + error.message)
    else fetchAnnouncements()
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement permanently?')) return
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) alert('Error deleting: ' + error.message)
    else fetchAnnouncements()
  }

  return (
    <div className="min-h-screen bg-court-dots py-8 sm:py-10 px-4">
      <div className="max-w-5xl xl:max-w-6xl mx-auto">
        <span className="type-eyebrow text-amber-500 mb-1 block">Communications</span>
        <h1 className="type-h1 text-court-700 text-3xl sm:text-4xl mb-1">Announcements</h1>
        <p className="type-body mb-6 sm:mb-8">
          Post court closures, tournament notices, and maintenance schedules for players.
        </p>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Create form */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="type-h2 mb-4">New Announcement</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="field-label">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Court closed for maintenance"
                    required
                    maxLength={120}
                    className="field-input focusable"
                  />
                </div>
                <div>
                  <label className="field-label">Message</label>
                  <textarea
                    rows="5"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Share the details players need to know…"
                    required
                    className="field-input focusable resize-y"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary py-2.5 px-6 disabled:opacity-60"
                >
                  {submitting ? 'Posting…' : 'Post Announcement'}
                </button>
                {msg && (
                  <p className={`text-sm font-semibold ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                    {msg}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Existing list */}
          <div className="lg:col-span-3">
            <div className="card p-6">
              <h2 className="type-h2 mb-4">
                Posted Announcements{' '}
                <span className="text-sm font-normal text-gray-400">({announcements.length})</span>
              </h2>

              {loading ? (
                <ListSkeleton />
              ) : announcements.length === 0 ? (
                <p className="type-body text-gray-500 py-6 text-center">
                  No announcements yet. Post your first one on the left.
                </p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className={`card p-4 border-l-4 transition-colors ${
                        a.is_active ? 'border-l-amber-400' : 'border-l-gray-300 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-court-700 break-words font-display">{a.title}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                a.is_active ? 'bg-court-50 text-court-600 border-court-100' : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}
                            >
                              {a.is_active ? 'Active' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">{a.body}</p>
                          <p className="text-xs text-gray-400 mt-2">{formatDateTime(a.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => toggleActive(a)}
                          className="link text-court-600 hover:text-court-700 text-xs font-bold uppercase tracking-wide"
                        >
                          {a.is_active ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="link text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wide"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
