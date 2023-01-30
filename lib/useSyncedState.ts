import { useState, useLayoutEffect, Dispatch, SetStateAction } from 'react'

export function useSyncedState<T>(val: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(val)
  useBrowserLayoutEffect(() => setValue(val), [val])
  return [value, setValue]
}

const useBrowserLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : () => {}
