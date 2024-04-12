import { useEffect, useState } from 'react'
import client from './client'
import { AuthState } from './types'

export function useSession() {
  const [session, setSession] = useState(
    client.authState === AuthState.LoggedOut ? null : client.session,
  )
  useEffect(() => {
    const updateSession = () =>
      setSession(
        client.authState === AuthState.LoggedOut ? null : client.session,
      )
    client.addEventListener('change', updateSession)
    return () => client.removeEventListener('change', updateSession)
  }, [])
  return session
}
