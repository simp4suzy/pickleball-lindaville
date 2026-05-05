import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthGuard from './components/AuthGuard'
import AdminGuard from './components/AdminGuard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import CourtDetail from './pages/CourtDetail'
import BookingPage from './pages/BookingPage'
import MyBookings from './pages/MyBookings'
import AdminPanel from './pages/AdminPanel'

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

/* ─── Pickleball SVG logo mark ─────────────────────────────────────────── */
function PickleballMark({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="15" fill={token.amber400} />
      <circle cx="10" cy="11" r="2" fill={token.green800} opacity="0.55" />
      <circle cx="22" cy="11" r="2" fill={token.green800} opacity="0.55" />
      <circle cx="16" cy="16" r="2" fill={token.green800} opacity="0.55" />
      <circle cx="10" cy="21" r="2" fill={token.green800} opacity="0.55" />
      <circle cx="22" cy="21" r="2" fill={token.green800} opacity="0.55" />
      <path
        d="M4 16 Q10 8 16 16 Q22 24 28 16"
        stroke={token.green800}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
        fill="none"
      />
    </svg>
  )
}

/* ─── Navbar ────────────────────────────────────────────────────────────── */
function Navbar() {
  const { user, signOut } = useAuth()

  const navLinkClass = ({ isActive }) =>
    [
      'relative px-1 py-0.5 text-sm font-medium tracking-wide transition-colors duration-200',
      'after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left',
      'after:scale-x-0 after:bg-amber-400 after:transition-transform after:duration-200',
      isActive
        ? 'text-amber-300 after:scale-x-100'
        : 'text-green-100 hover:text-amber-200 hover:after:scale-x-100',
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
            className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
            style={{ display: 'inline-flex' }}
          >
            <PickleballMark size={34} />
          </span>
          <span className="hidden sm:flex flex-col leading-tight">
            <span
              className="font-bold text-base tracking-tight"
              style={{ color: token.amber300, fontFamily: "'Georgia', serif" }}
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

        <div className="flex items-center gap-1 sm:gap-3">
          {user ? (
            <>
              <NavLink to="/my-bookings" className={navLinkClass}>
                My Bookings
              </NavLink>

              {user.user_metadata?.role === 'admin' && (
                <NavLink to="/admin" className={navLinkClass}>
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
                <span className="hidden sm:inline">Log Out</span>
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
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <PickleballMark size={28} />
            <div className="flex flex-col leading-tight">
              <span
                className="font-bold text-sm tracking-tight"
                style={{ color: token.amber300, fontFamily: "'Georgia', serif" }}
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

/* ─── App ───────────────────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen" style={{ background: token.offwhite }}>
          <Navbar />
          <main className="flex-grow">
            <Routes>
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
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App