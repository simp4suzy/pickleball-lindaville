import { Link } from 'react-router-dom'
import Logo from './Logo'

/**
 * Shared premium shell for Login / Signup / Forgot Password.
 * Centered branded card over a subtle court-dots backdrop.
 */
export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-court-dots flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand lockup */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link to="/" aria-label="Lindaville Pickleball home" className="focusable rounded-2xl">
            <Logo size={72} className="shadow-card mb-3" ring />
          </Link>
          <span className="font-display font-bold text-court-700 text-lg tracking-tight">
            Lindaville Ace Paddlers
          </span>
        </div>

        <div className="card card-accent p-7 sm:p-8">
          <div className="mb-6 text-center">
            {eyebrow && <span className="type-eyebrow text-amber-500 mb-1.5 block">{eyebrow}</span>}
            <h1 className="type-h1 text-court-700">{title}</h1>
            {subtitle && <p className="type-body text-sm mt-2">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
