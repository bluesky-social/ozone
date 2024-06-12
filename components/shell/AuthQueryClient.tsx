import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useAuthDid } from './AuthContext'

/**
 * Provides a `QueryClient` that is reset when the account changes.
 */
export function AuthQueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const accountDid = useAuthDid()

  const accountDidRef = useRef(accountDid)

  useEffect(() => {
    if (accountDidRef.current !== accountDid) {
      accountDidRef.current = accountDid
      queryClient.clear()
    }
  }, [queryClient, accountDid])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
