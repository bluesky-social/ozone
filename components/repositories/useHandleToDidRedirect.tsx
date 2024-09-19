'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { getDidFromHandle } from '@/lib/identity'
import { useSignaledEffect } from '@/lib/useSignaledEffect'

export const useHandleToDidRedirect = (
  handle: string,
  buildRedirectUrl: (did: string) => string,
) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isFetching, setIsFetching] = useState<boolean>(true)

  const paramsRef = useRef(searchParams.toString())
  useEffect(() => {
    paramsRef.current = searchParams.toString()
  }, [searchParams])

  const buildRedirectUrlRef = useRef(buildRedirectUrl)
  useEffect(() => {
    buildRedirectUrlRef.current = buildRedirectUrl
  }, [buildRedirectUrl])

  useSignaledEffect(
    (signal) => {
      // If the handle is already a DID, don't try to resolve it
      if (handle.startsWith('did:')) {
        setIsFetching(false)
      } else {
        setIsFetching(true)

        void getDidFromHandle(handle).then((did) => {
          if (signal.aborted) return

          if (did) {
            let url = buildRedirectUrlRef.current(did)
            if (paramsRef.current) {
              url += `?${paramsRef.current}`
            }
            router.replace(url)
          }
          setIsFetching(false)
        })
      }
    },
    [router, handle],
  )

  return { isFetching }
}
