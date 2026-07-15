import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContextStore'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { resetPasswordForEmail } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage('')
    setLoading(true)

    const { error } = await resetPasswordForEmail(email)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password reset link sent! Check your email inbox.')
    }
    setLoading(false)
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure reset link."
    >
      {error && (
        <p role="alert" className="mb-4 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-4 text-sm font-semibold text-court-700 bg-court-50 border border-court-100 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          {message}
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
        <button type="submit" disabled={loading} className="btn btn-amber w-full py-3.5 text-base font-extrabold">
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
        Remembered your password?{' '}
        <Link to="/login" className="link">Log in</Link>
      </p>
    </AuthLayout>
  )
}
