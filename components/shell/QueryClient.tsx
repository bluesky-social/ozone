import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, ReactNode, useEffect, useRef, useState } from 'react'
import { useAuthDid } from './AuthContext'

export const GLOBAL_QUERY_CONTEXT = createContext<QueryClient | undefined>(
  undefined,
)

/**
 * Provides a `QueryClient` that is meant to be used for queries that
 * do not depend on the current user.
 */
export function GlobalQueryClientProvider({
  children,
}: {
  children: ReactNode
}) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient} context={GLOBAL_QUERY_CONTEXT}>
      {children}
    </QueryClientProvider>
  )
}

/**
 * Provides a `QueryClient` that is reset when the account changes.
 */
export function DefaultQueryClientProvider({
  children,
}: {
  children: ReactNode
}) {
  const [queryClient] = useState(createQueryClient)
  const accountDid = useAuthDid()

  // Keep a reference to avoid double clear in strict mode
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

function createQueryClient() {
  return new QueryClient()
}
