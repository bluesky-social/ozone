import { useCallback } from 'react'

import { useValueRef } from './useValueRef'

export function useCallbackRef<T extends (this: any, ...args: any[]) => any>(
  fn: T,
): (this: ThisParameterType<T>, ...args: Parameters<T>) => ReturnType<T>

export function useCallbackRef<T extends (this: any, ...args: any[]) => any>(
  fn?: T,
): (this: ThisParameterType<T>, ...args: Parameters<T>) => void | ReturnType<T>

export function useCallbackRef<T extends (this: any, ...args: any[]) => any>(
  fn?: T,
) {
  const fnRef = useValueRef(fn)
  return useCallback(
    function (
      this: ThisParameterType<T>,
      ...args: Parameters<T>
    ): void | ReturnType<T> {
      const { current } = fnRef
      if (current) return current.call(this, ...args)
    },
    [fnRef],
  )
}
