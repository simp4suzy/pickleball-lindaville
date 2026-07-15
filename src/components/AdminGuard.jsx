import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/authContextStore'
import PageLoader from './PageLoader'

export default function AdminGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader label="Verifying access" />
  }

  // If the user is not logged in OR their role is not 'admin', kick them out
  if (!user || user.user_metadata?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
