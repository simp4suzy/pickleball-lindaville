import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContextStore'
import AuthLayout from '../components/AuthLayout'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/') // Go to home page after successful signup
    }
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Join Lindaville Phase 2 and book your first game in minutes."
    >
      {error && (
        <p role="alert" className="mb-4 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input focusable"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              required
              minLength="6"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input focusable pr-12"
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-0 px-3.5 flex items-center text-gray-400 hover:text-court-600 focusable rounded-r-xl"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><path d="M1 1l22 22" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--ink-muted)' }}>Use at least 6 characters.</p>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3.5 text-base">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
        Already have an account?{' '}
        <Link to="/login" className="link">Log in</Link>
      </p>
    </AuthLayout>
  )
}
