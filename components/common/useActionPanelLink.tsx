import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export const useActionPanelLink = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createLink = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('quickOpen', value)

      return `${pathname}?${params.toString()}`
    },
    [searchParams, pathname],
  )

  return createLink
}
