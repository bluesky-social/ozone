import { useState, useEffect } from 'react'
import { RefObject } from 'react'

export function useOnScreen<T extends Element>(ref: RefObject<T>) {
  const [isIntersecting, setIntersecting] = useState(false)

  const observer = new IntersectionObserver(([entry]) =>
    setIntersecting(entry.isIntersecting)
  )

  useEffect(() => {
    if (ref.current) {
      observer.observe(ref.current)
    }
    // Remove the observer as soon as the component is unmounted
    return () => {
      observer.disconnect()
    }
  }, [])

  return isIntersecting
}
