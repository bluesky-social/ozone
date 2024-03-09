import { AuthState } from '@/lib/types'
import { createContext, useState } from 'react'

// This may seem a bit over-engineered but this is only the groundwork so while the current data model is simplistic
// and could probably be handled in a simpler setup, the below setup helps us evolve the context to hold much complex
// model and expose only what may be needed by UI if/when we have complex authorization based on user role etc.

export { AuthState } from '@/lib/types'

type AuthContextData = {
  authState: AuthState
  isLoggedIn: boolean
  isValidatingAuth: boolean
}

const getAuthContextDataFromState = (authState: AuthState): AuthContextData => {
  return {
    authState,
    isLoggedIn: authState === AuthState.LoggedIn,
    isValidatingAuth: authState === AuthState.Validating,
  }
}

const initialContextData = {
  authState: AuthState.Validating,
  isValidatingAuth: true,
  isLoggedIn: false,
}

export const AuthContext = createContext<AuthContextData>(initialContextData)
export const AuthChangeContext = createContext<(authState: AuthState) => void>(
  (_: AuthState) => null,
)

export const AuthProvider = ({ children }) => {
  const [authContextData, setAuthContextData] =
    useState<AuthContextData>(initialContextData) // immediately corrected in useEffect below

  return (
    <AuthContext.Provider value={authContextData}>
      <AuthChangeContext.Provider
        value={(authState) =>
          setAuthContextData(getAuthContextDataFromState(authState))
        }
      >
        {children}
      </AuthChangeContext.Provider>
    </AuthContext.Provider>
  )
}
