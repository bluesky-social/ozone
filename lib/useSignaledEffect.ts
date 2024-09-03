import { DependencyList, useEffect } from 'react'

/**
 * @example
 *
 * ```ts
 * const url = 'https://api.example.com/data';
 *
 * useSignaledEffect((signal) => {
 *   fetch(url, { signal })
 *     .then(() => {
 *        // handle response
 *      })
 *     .catch(reason => {
 *       if (!signal.aborted) {
 *         // handle failure
 *       } else {
 *         // handle abort (optional)
 *       }
 *     });
 * }, [url]);
 * ```
 */
export function useSignaledEffect(
  fn: (signal: AbortSignal) => void | (() => void),
  deps?: DependencyList,
) {
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const controller = new AbortController()
    const cleanup = fn(controller.signal)
    return () => {
      controller.abort()
      cleanup?.()
    }
  }, deps)
  /* eslint-enable react-hooks/exhaustive-deps */
}
