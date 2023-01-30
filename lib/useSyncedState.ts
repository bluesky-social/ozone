import { useState, useLayoutEffect, Dispatch, SetStateAction } from 'react'

export function useSyncedState<T>(val: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(val)
  useLayoutEffect(() => setValue(val), [val])
  return [value, setValue]
}
