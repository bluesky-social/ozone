'use client'
import { useContext, useEffect, useState } from 'react'
import { redirect, useRouter, useSearchParams } from 'next/navigation'

import { getDidFromHandle } from '@/lib/identity'
import clientManager from '@/lib/client'
import { AuthContext } from '@/shell/AuthContext'

export const useHandleToDidRedirect = (
  handle: string,
  buildRedirectUrl: (did: string) => string,
) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isFetching, setIsFetching] = useState<boolean>(true)
  const { isLoggedIn } = useContext(AuthContext)

  useEffect(() => {
    setIsFetching(true)

    // If the handle is already a DID, don't try to resolve it
    if (handle.startsWith('did:')) {
      setIsFetching(false)
      return
    }

    // If we aren't logged in yet, leave the state at loading and don't try to resolve handle
    if (!isLoggedIn) {
      return
    }

    const fetchDidAndRedirect = async () => {
      const did = await getDidFromHandle(handle)
      const params = searchParams.toString()
      if (did) {
        let url = buildRedirectUrl(did)
        if (params) {
          url += `?${params}`
        }
        router.replace(url)
      }
      setIsFetching(false)
    }

    fetchDidAndRedirect()
  }, [handle, isLoggedIn])

  return { isFetching }
}
