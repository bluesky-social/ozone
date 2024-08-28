import type { AuthorizeOptions } from '@atproto/oauth-client-browser'
import { LockClosedIcon } from '@heroicons/react/20/solid'
import { FormEvent, useCallback, useState } from 'react'

import { ErrorInfo } from '@/common/ErrorInfo'
import { OAuthSignIn } from './useOAuth'

export type { OAuthSignIn }

/**
 * @returns Nice tailwind css form asking to enter either a handle or the host
 *   to use to login.
 */
export function OAuthSignInForm({
  signIn,
  ...props
}: {
  signIn: OAuthSignIn
} & Omit<React.HTMLAttributes<HTMLFormElement>, 'onSubmit'>) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (loading) return

      setError(null)
      setLoading(true)

      try {
        await signIn(value)
      } catch (err) {
        setError(err?.['message'] || String(err))
      } finally {
        setLoading(false)
      }
    },
    [loading, value, signIn],
  )

  const submitButtonClassNames = `group relative flex w-full justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-slate-500 focus:ring-offset-2 ${
    loading
      ? 'bg-gray-500 hover:bg-gray-600'
      : 'bg-rose-600 dark:bg-teal-600 hover:bg-rose-700 dark:hover:bg-teal-700'
  }`
  const submitButtonIconClassNames = `h-5 w-5 ${
    loading
      ? 'text-gray-800 group-hover:text-gray-700'
      : 'text-rose-500 dark:text-gray-50 group-hover:text-rose-400 dark:group-hover:text-gray-100'
  }`

  return (
    <form {...props} onSubmit={onSubmit}>
      <div className="-space-y-px rounded-md shadow-sm">
        <div>
          <label htmlFor="account-handle" className="sr-only">
            Account handle
          </label>
          <input
            id="account-handle"
            name="handle"
            type="text"
            required
            disabled={loading}
            className="relative block w-full appearance-none rounded-md border border-gray-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 dark:focus:ring-slate-500 sm:text-sm"
            placeholder="Account handle"
            value={value}
            onChange={(e) => {
              setError(null)
              setValue(e.target.value)
            }}
          />
        </div>
      </div>

      {error != null ? <ErrorInfo>{error}</ErrorInfo> : undefined}

      <div>
        <button
          type="submit"
          disabled={loading}
          className={submitButtonClassNames}
        >
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <LockClosedIcon
              className={submitButtonIconClassNames}
              aria-hidden="true"
            />
          </span>
          {loading ? 'Authenticating...' : 'Sign in'}
        </button>
      </div>
    </form>
  )
}
