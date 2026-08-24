import { ResponseType, XRPCError } from '@atproto/xrpc'

/**
 * Rate-limit-aware retry for a single async operation.
 *
 * The workspace batch-action path fires many emitEvent calls at once with no
 * 429 handling: once the server's rate limit trips, every subsequent call
 * fails permanently and the user has to manually re-run the failures. This
 * helper wraps a single call so a 429 is retried with backoff instead of
 * failing outright — honouring the server's `ratelimit-reset` when present,
 * otherwise exponential backoff.
 *
 * Non-rate-limit errors are thrown immediately (no point retrying a bad
 * request). Kept free of React/toast deps so it can be unit-tested directly.
 */

export const isRateLimitError = (error: unknown): boolean =>
  error instanceof XRPCError && error.status === ResponseType.RateLimitExceeded

/**
 * How long to wait before the next attempt, in ms. Prefers the server's
 * `ratelimit-reset` (epoch seconds) when the window is exhausted; otherwise
 * exponential backoff capped at 30s. `now` is injectable for testing.
 */
export const rateLimitRetryDelay = (
  attempt: number,
  error: unknown,
  now: number = Date.now(),
): number => {
  if (
    error instanceof XRPCError &&
    error.status === ResponseType.RateLimitExceeded &&
    error.headers?.['ratelimit-reset']
  ) {
    const reset = Number(error.headers['ratelimit-reset']) * 1e3
    const wait = reset - now
    if (Number.isFinite(wait) && wait > 0) return Math.min(wait, 30_000)
  }
  return Math.min(1000 * 2 ** attempt, 30_000)
}

export type RetryOptions = {
  maxRetries?: number
  /** Override the delay computation (used in tests to avoid real waits). */
  getDelayMs?: (attempt: number, error: unknown) => number
  /** Injectable sleep (used in tests). */
  sleep?: (ms: number) => Promise<void>
  /** Called before each retry, e.g. to surface "rate limited, retrying…". */
  onRetry?: (attempt: number, delayMs: number) => void
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Run `operation`, retrying only on rate-limit (429) errors up to `maxRetries`
 * times. Resolves with the operation's value, or throws the last error if it
 * is not a rate-limit error or retries are exhausted.
 */
export const withRateLimitRetry = async <T>(
  operation: () => Promise<T>,
  {
    maxRetries = 3,
    getDelayMs = rateLimitRetryDelay,
    sleep = defaultSleep,
    onRetry,
  }: RetryOptions = {},
): Promise<T> => {
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await operation()
    } catch (err) {
      if (!isRateLimitError(err) || attempt >= maxRetries) {
        throw err
      }
      const delayMs = getDelayMs(attempt, err)
      onRetry?.(attempt + 1, delayMs)
      await sleep(delayMs)
      attempt++
    }
  }
}
