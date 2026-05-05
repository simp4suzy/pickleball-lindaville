import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const { resetPasswordForEmail } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage('')
    
    const { error } = await resetPasswordForEmail(email)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password reset link sent! Check your email inbox.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-green-600 mb-6 text-center">
          Reset Password
        </h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        {message && <p className="text-green-500 mb-4 text-center">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-yellow-500 text-gray-900 font-semibold py-2 rounded-md hover:bg-yellow-600 transition"
          >
            Send Reset Link
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
          Remembered your password?{' '}
          <Link to="/login" className="text-green-600 hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  )
}