'use client'
import { useRef, useEffect } from 'react'
import { useOnScreen } from '@/lib/useOnScreen'

export function LoadMore({ onLoadMore }: { onLoadMore: () => void }) {
  const ref = useRef(null)
  const isVisible = useOnScreen<HTMLDivElement>(ref)

  useEffect(() => {
    if (isVisible) {
      onLoadMore()
    }
  }, [isVisible])

  return (
    <div ref={ref} className="p-6">
      Loading...
    </div>
  )
}
