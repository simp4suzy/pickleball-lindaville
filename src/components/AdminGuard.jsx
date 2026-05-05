import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  // If the user is not logged in OR their role is not 'admin', kick them out
  if (!user || user.user_metadata?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}