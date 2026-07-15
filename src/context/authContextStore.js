import { createContext, useContext } from 'react'

// Context lives in its own module so component files can stay
// "components-only" for React Fast Refresh (react-refresh/only-export-components).
export const AuthContext = createContext({})

// Hook to read the auth context from anywhere in the app.
export const useAuth = () => useContext(AuthContext)
