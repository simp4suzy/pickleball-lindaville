import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/authContextStore'
import { lockBodyScroll } from './lib/scrollLock'
import AuthGuard from './components/AuthGuard'
import AdminGuard from './components/AdminGuard'
import Logo from './components/Logo'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import CourtDetail from './pages/CourtDetail'
import BookingPage from './pages/BookingPage'
import MyBookings from './pages/MyBookings'
import AdminPanel from './pages/AdminPanel'
import AdminAnnouncements from './pages/AdminAnnouncements'

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const token = {
  green900: '#0f2d1a',
  green800: '#14381f',
  green700: '#1a4a28',
  green600: '#1e5c2f',
  amber400: '#f0b429',
  amber300: '#f7cb61',
  amber200: '#fde68a',
  white: '#ffffff',
  offwhite: '#f9faf7',
}

/* ─── Navbar ────────────────────────────────────────────────────────────── */
function Navbar() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Lock body scroll while the mobile drawer is open, via the shared
  // reference-counted lock so it never fights the "View ticket" modal for
  // ownership of document.body.style.overflow.
  useEffect(() => {
    if (!menuOpen) return undefined
    const release = lockBodyScroll()
    return release
  }, [menuOpen])

  const navLinkClass = ({ isActive }) =>
    [
      'relative px-1 py-0.5 text-sm font-medium tracking-wide transition-colors duration-200',
      'after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left',
      'after:scale-x-0 after:bg-amber-400 after:transition-transform after:duration-200',
      isActive
        ? 'text-amber-300 after:scale-x-100'
        : 'text-green-100 hover:text-amber-200 hover:after:scale-x-100',
    ].join(' ')

  // Full-width tap targets for the mobile drawer.
  const mobileLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-semibold tracking-wide transition-colors duration-200',
      isActive
        ? 'text-green-900 bg-amber-300'
        : 'text-amber-100 hover:text-amber-200 hover:bg-white/5',
    ].join(' ')

  return (
    <nav
      className="sticky top-0 z-50 shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${token.green900} 0%, ${token.green800} 100%)`,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid rgba(240,180,41,0.18)`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="Lindaville Pickleball home"
        >
          <span
            className="transition-transform duration-300 group-hover:scale-105"
            style={{ display: 'inline-flex' }}
          >
            <Logo size={40} ring />
          </span>
          <span className="flex flex-col leading-tight">
            <span
              className="font-display font-extrabold text-base tracking-tight"
              style={{ color: token.amber300 }}
            >
              Lindaville
            </span>
            <span
              className="text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: `${token.amber200}99` }}
            >
              Pickleball
            </span>
          </span>
        </Link>

        {/* Desktop / tablet links (md and up) */}
        <div className="hidden md:flex items-center gap-3 lg:gap-5">
          {user ? (
            <>
              <NavLink to="/" className={navLinkClass} end>
                Home
              </NavLink>
              <NavLink to="/my-bookings" className={navLinkClass}>
                My Bookings
              </NavLink>

              {user.user_metadata?.role === 'admin' && (
                <NavLink to="/admin" className={navLinkClass} end>
                  <span className="flex items-center gap-1">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 1.5A1.5 1.5 0 116 7a1.5 1.5 0 010-4.5zM6 8c-1.657 0-3 .895-3 2h6c0-1.105-1.343-2-3-2z" />
                    </svg>
                    Admin
                  </span>
                </NavLink>
              )}

              {user.user_metadata?.role === 'admin' && (
                <NavLink to="/admin/announcements" className={navLinkClass}>
                  News
                </NavLink>
              )}

              <Link
                to="/book"
                className="ml-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-200 shadow-sm font-display"
                style={{
                  background: `linear-gradient(135deg, ${token.amber400} 0%, ${token.amber300} 100%)`,
                  color: token.green900,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 18px ${token.amber400}66`
                  e.currentTarget.style.filter = 'brightness(1.04)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.filter = 'none'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Book a Court
              </Link>

              <button
                onClick={signOut}
                className="
                  ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                  text-xs font-semibold tracking-wide uppercase
                  transition-all duration-200 border
                "
                style={{
                  color: token.amber300,
                  borderColor: `${token.amber400}55`,
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${token.amber400}22`
                  e.currentTarget.style.borderColor = token.amber400
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = `${token.amber400}55`
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Log In
              </NavLink>

              <Link
                to="/signup"
                className="
                  ml-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md
                  text-xs font-bold tracking-wide uppercase
                  transition-all duration-200 shadow-sm
                "
                style={{
                  background: `linear-gradient(135deg, ${token.amber400} 0%, ${token.amber300} 100%)`,
                  color: token.green900,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${token.amber300} 0%, ${token.amber200} 100%)`
                  e.currentTarget.style.boxShadow = `0 0 16px ${token.amber400}66`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${token.amber400} 0%, ${token.amber300} 100%)`
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                Sign Up Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger (below md) */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-amber-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      <div
        className={`md:hidden fixed inset-0 top-16 z-40 transition-opacity duration-200 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
        {/* Panel */}
        <div
          id="mobile-nav-drawer"
          className={`absolute left-0 right-0 top-0 px-4 pt-4 pb-6 shadow-2xl transition-transform duration-200 ${
            menuOpen ? 'translate-y-0' : '-translate-y-4'
          }`}
          style={{
            background: `linear-gradient(160deg, ${token.green900} 0%, ${token.green800} 100%)`,
            borderBottom: `1px solid rgba(240,180,41,0.18)`,
          }}
        >
          <div className="flex flex-col gap-2">
            {user ? (
              <>
                <NavLink to="/" className={mobileLinkClass} end onClick={() => setMenuOpen(false)}>
                  Home
                </NavLink>
                <NavLink to="/book" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                  Book a Court
                </NavLink>
                <NavLink to="/my-bookings" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                  My Bookings
                </NavLink>
                {user.user_metadata?.role === 'admin' && (
                  <NavLink to="/admin" className={mobileLinkClass} end onClick={() => setMenuOpen(false)}>
                    Admin Panel
                  </NavLink>
                )}
                {user.user_metadata?.role === 'admin' && (
                  <NavLink to="/admin/announcements" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                    Announcements
                  </NavLink>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    signOut()
                  }}
                  className="mt-2 flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-semibold tracking-wide border transition-colors"
                  style={{ color: token.amber300, borderColor: `${token.amber400}55` }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log Out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/" className={mobileLinkClass} end onClick={() => setMenuOpen(false)}>
                  Home
                </NavLink>
                <NavLink to="/login" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                  Log In
                </NavLink>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 flex items-center justify-center w-full px-4 py-3 rounded-lg text-base font-bold tracking-wide uppercase shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${token.amber400} 0%, ${token.amber300} 100%)`,
                    color: token.green900,
                  }}
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

/* ─── Footer ────────────────────────────────────────────────────────────── */
function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        background: `linear-gradient(180deg, ${token.green900} 0%, #081910 100%)`,
        borderTop: `1px solid rgba(240,180,41,0.12)`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">
          <div className="flex items-center gap-3">
            <Logo size={40} ring />
            <div className="flex flex-col leading-tight">
              <span
                className="font-display font-bold text-sm tracking-tight"
                style={{ color: token.amber300 }}
              >
                Lindaville Pickleball
              </span>
              <span
                className="text-[10px] tracking-widest uppercase"
                style={{ color: `${token.amber200}70` }}
              >
                Booking System
              </span>
            </div>
          </div>

          {/* Connect / social links */}
          <div className="flex flex-col items-center sm:items-start">
            <p
              className="text-xs font-semibold tracking-wide uppercase mb-2.5"
              style={{ color: token.amber300 }}
            >
              Connect
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/share/18YyYqRcS3/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                title="Facebook"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
                style={{ color: token.amber300, borderColor: `${token.amber400}45`, background: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${token.amber400}22`
                  e.currentTarget.style.borderColor = token.amber400
                  e.currentTarget.style.color = token.amber200
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = `${token.amber400}45`
                  e.currentTarget.style.color = token.amber300
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
                </svg>
              </a>

              <a
                href="https://github.com/simp4suzy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title="GitHub"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
                style={{ color: token.amber300, borderColor: `${token.amber400}45`, background: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${token.amber400}22`
                  e.currentTarget.style.borderColor = token.amber400
                  e.currentTarget.style.color = token.amber200
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = `${token.amber400}45`
                  e.currentTarget.style.color = token.amber300
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 2.5-.34c.85 0 1.71.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
                </svg>
              </a>

              <a
                href="mailto:freinznapallacan19@gmail.com"
                aria-label="Email"
                title="freinznapallacan19@gmail.com"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
                style={{ color: token.amber300, borderColor: `${token.amber400}45`, background: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${token.amber400}22`
                  e.currentTarget.style.borderColor = token.amber400
                  e.currentTarget.style.color = token.amber200
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = `${token.amber400}45`
                  e.currentTarget.style.color = token.amber300
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
              </a>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p
              className="text-xs font-semibold tracking-wide uppercase mb-0.5"
              style={{ color: token.amber300 }}
            >
              Location
            </p>
            <p className="text-xs leading-relaxed" style={{ color: `${token.amber200}80` }}>
              Lindaville Subdivision Phase 2
            </p>
            <p className="text-xs" style={{ color: `${token.amber200}80` }}>
              Multi-Purpose Hall
            </p>
            <p className="text-xs" style={{ color: `${token.amber200}80` }}>
              Tagbilaran City, Bohol, Philippines
            </p>
          </div>
        </div>

        <div
          className="my-6 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${token.amber400}30, transparent)` }}
        />

        <p className="text-center text-[11px] tracking-wide" style={{ color: `${token.amber200}45` }}>
          &copy; {year} Lindaville Pickleball Booking System · All rights reserved
        </p>
      </div>
    </footer>
  )
}

/* ─── Route transitions (CSS-only, keyed by pathname) ─────────────────── */
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<CourtDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/book"
          element={
            <AuthGuard>
              <BookingPage />
            </AuthGuard>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <AuthGuard>
              <MyBookings />
            </AuthGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminPanel />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <AdminGuard>
              <AdminAnnouncements />
            </AdminGuard>
          }
        />
      </Routes>
    </div>
  )
}

/* ─── App ───────────────────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen" style={{ background: token.offwhite }}>
          <Navbar />
          <main className="flex-grow w-full">
            <div className="mx-auto w-full max-w-[1600px]">
              <AnimatedRoutes />
            </div>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App