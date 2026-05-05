import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()

  // While checking if the user is logged in, show a loading message
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  // If there is no user, redirect them to the login page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If the user is logged in, show the protected page
  return children
}