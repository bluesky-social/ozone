import { useEffect, useRef } from 'react'

export function useValueRef<T>(value: T) {
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])
  return valueRef
}
