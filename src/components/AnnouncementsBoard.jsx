import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/authContextStore'

function timeAgo(ts) {
  if (!ts) return ''
  const date = new Date(ts)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Active announcements feed for the homepage.
 * Only authenticated users can read announcements (RLS), so we skip the
 * fetch entirely for signed-out visitors and render nothing.
 */
export default function AnnouncementsBoard() {
  const { user, loading: authLoading } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchActive() {
      if (!user) {
        setAnnouncements([])
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (error) console.error('Error fetching announcements:', error)
        else setAnnouncements(data || [])
        setLoading(false)
      }
    }

    if (!authLoading) fetchActive()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  // Nothing to show for signed-out visitors or when there are no active posts.
  if (!user || authLoading) return null
  if (!loading && announcements.length === 0) return null

  return (
    <section className="max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 pb-6">
      <div className="card card-accent p-5 sm:p-7">
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-grad text-court-900 shadow-amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11l18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
            </svg>
          </span>
          <h2 className="type-h2 text-court-700">Announcements</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-4">
            {announcements.map((a) => (
              <li key={a.id} className="border-l-4 border-amber-400 pl-4">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="font-bold text-court-700 font-display">{a.title}</h3>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(a.created_at)}</span>
                </div>
                <p className="type-body text-gray-600 mt-1 whitespace-pre-wrap break-words">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
