import { ComAtprotoServerCreateSession } from '@atproto/api'
import { LockClosedIcon } from '@heroicons/react/20/solid'
import { createRef, FormEvent, useCallback, useState } from 'react'

import { Alert } from '@/common/Alert'
import { ErrorInfo } from '@/common/ErrorInfo'

export type AtpSignIn = (input: {
  identifier: string
  password: string
  authFactorToken?: string
  service: string
}) => unknown

/**
 * @returns Nice tailwind css form asking to enter either a handle or the host
 *   to use to login.
 */
export function AtpSignInForm({
  signIn,
  ...props
}: {
  signIn: AtpSignIn
} & Omit<React.HTMLAttributes<HTMLFormElement>, 'onSubmit'>) {
  const [error, setError] = useState<string | null>(null)
  const [isValidatingAuth, setIsValidatingAuth] = useState(false)

  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [service, setService] = useState('http://localhost:2583')
  const [authFactor, setAuthFactor] = useState<{
    token: string
    isInvalid: boolean
    isNeeded: boolean
  }>({
    token: '',
    isNeeded: false,
    isInvalid: false,
  })

  const handleRef = createRef<HTMLInputElement>()

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (isValidatingAuth) return

      setIsValidatingAuth(true)

      try {
        await signIn({
          identifier: handle,
          password,
          service,
          authFactorToken: authFactor.isNeeded ? authFactor.token : undefined,
        })
      } catch (err) {
        const errMsg = (err as Error).toString()
        if (
          err instanceof
          ComAtprotoServerCreateSession.AuthFactorTokenRequiredError
        ) {
          setAuthFactor({ ...authFactor, isNeeded: true })
        } else if (errMsg.includes('Token is invalid')) {
          setAuthFactor({ ...authFactor, isInvalid: true })
        } else {
          setError(errMsg)
        }
      } finally {
        setIsValidatingAuth(false)
      }
    },
    [authFactor, isValidatingAuth, handle, password, service, signIn],
  )

  const submitButtonClassNames = `group relative flex w-full justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-slate-500 focus:ring-offset-2 ${
    isValidatingAuth
      ? 'bg-gray-500 hover:bg-gray-600'
      : 'bg-rose-600 dark:bg-teal-600 hover:bg-rose-700 dark:hover:bg-teal-700'
  }`
  const submitButtonIconClassNames = `h-5 w-5 ${
    isValidatingAuth
      ? 'text-gray-800 group-hover:text-gray-700'
      : 'text-rose-500 dark:text-gray-50 group-hover:text-rose-400 dark:group-hover:text-gray-100'
  }`

  return (
    <form {...props} onSubmit={onSubmit}>
      <input type="hidden" name="remember" defaultValue="true" />
      <div className="-space-y-px rounded-md shadow-sm">
        <div>
          <label htmlFor="service-url" className="sr-only">
            Service
          </label>
          <input
            id="service-url"
            name="service"
            type="text"
            required
            disabled={isValidatingAuth}
            className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 dark:focus:ring-slate-500 sm:text-sm"
            placeholder="Service URL"
            list="service-url-suggestions"
            value={service}
            onChange={(e) => setService(e.target.value)}
          />
          <datalist id="service-url-suggestions">
            <option value="https://bsky.social" />
            <option value="https://staging.bsky.dev" />
          </datalist>
        </div>
        <div>
          <label htmlFor="account-handle" className="sr-only">
            Account handle
          </label>
          <input
            id="account-handle"
            name="handle"
            type="text"
            required
            ref={handleRef}
            disabled={isValidatingAuth}
            className="relative block w-full appearance-none rounded-none border border-gray-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 dark:focus:ring-slate-500 sm:text-sm"
            placeholder="Account handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isValidatingAuth}
            className={`relative block w-full appearance-none rounded-none border border-gray-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 dark:focus:ring-slate-500 sm:text-sm ${
              authFactor.isNeeded ? '' : 'rounded-b-md'
            }`}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* When user fills in the token and hits submit again, the AuthState value changes to Validating so the input field goes away which is a bit odd */}
        {authFactor.isNeeded && (
          <div>
            <label htmlFor="authFactorToken" className="sr-only">
              2FA Confirmation
            </label>
            <input
              id="authFactorToken"
              name="authFactorToken"
              type="text"
              autoComplete="one-time-code"
              required
              autoFocus
              className={
                'relative block w-full appearance-none rounded-none border border-gray-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 dark:focus:ring-slate-500 sm:text-sm rounded-b-md'
              }
              placeholder="Confirmation Code"
              value={authFactor.token}
              onChange={(e) =>
                setAuthFactor({ ...authFactor, token: e.target.value })
              }
            />
          </div>
        )}
      </div>

      {authFactor.isNeeded && (
        <Alert
          type={authFactor.isInvalid ? 'error' : 'warning'}
          title={
            authFactor.isInvalid
              ? 'Invalid confirmation code!'
              : 'Email with confirmation code sent!'
          }
          body={
            <>
              Check your email for a confirmation code and enter it here or{' '}
              <button
                className="underline"
                onClick={(e) => {
                  e.preventDefault()
                  setAuthFactor({
                    token: '',
                    isNeeded: false,
                    isInvalid: false,
                  })
                  setHandle('')
                  setPassword('')
                  handleRef.current?.focus()
                }}
              >
                try a different account
              </button>
            </>
          }
        />
      )}

      {error ? <ErrorInfo>{error}</ErrorInfo> : undefined}

      <div>
        <button
          type="submit"
          disabled={isValidatingAuth}
          className={submitButtonClassNames}
        >
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <LockClosedIcon
              className={submitButtonIconClassNames}
              aria-hidden="true"
            />
          </span>
          {isValidatingAuth ? 'Authenticating...' : 'Sign in'}
        </button>
      </div>
    </form>
  )
}
