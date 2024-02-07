'use client'
import { useEffect, useState } from 'react'
import { redirect, useRouter, useSearchParams } from 'next/navigation'

import { getDidFromHandle } from '@/lib/identity'

export const useHandleToDidRedirect = (
  handle: string,
  buildRedirectUrl: (did: string) => string,
) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isFetching, setIsFetching] = useState<boolean>(true)

  useEffect(() => {
    if (handle.startsWith('did:')) {
      setIsFetching(false)
      return
    }

    const fetchDidAndRedirect = async () => {
      setIsFetching(true)
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
  }, [handle])

  return { isFetching }
}
