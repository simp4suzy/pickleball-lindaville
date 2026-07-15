import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/authContextStore'
import PageLoader from './PageLoader'

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()

  // While checking if the user is logged in, show a branded loader
  if (loading) {
    return <PageLoader label="Checking your session" />
  }

  // If there is no user, redirect them to the login page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If the user is logged in, show the protected page
  return children
}
