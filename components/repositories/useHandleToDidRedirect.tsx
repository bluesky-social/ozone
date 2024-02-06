'use client'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'

import { getDidFromHandle } from '@/lib/identity'

export const useHandleToDidRedirect = (
  handle: string,
  buildRedirectUrl: (did: string) => string,
) => {
  const [isFetching, setIsFetching] = useState<boolean>(true)

  useEffect(() => {
    if (handle.startsWith('did:')) {
      setIsFetching(false)
      return
    }

    const fetchDidAndRedirect = async () => {
      setIsFetching(true)
      const did = await getDidFromHandle(handle)
      if (did) {
        redirect(buildRedirectUrl(did))
      }
      setIsFetching(false)
    }

    fetchDidAndRedirect()
  }, [handle])

  return { isFetching }
}
