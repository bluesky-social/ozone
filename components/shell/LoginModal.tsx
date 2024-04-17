'use client'
import Image from 'next/image'
import { FormEvent, useState, useEffect, useContext } from 'react'
import { LockClosedIcon } from '@heroicons/react/20/solid'
import { AuthContext } from './AuthContext'
import { AuthState } from '@/lib/types'
import { ConfigurationFlow } from './ConfigurationFlow'
import { ErrorInfo } from '@/common/ErrorInfo'
import { Input } from '@/common/forms'

export function LoginModal({
  signIn,
  error,
}: {
  signIn: (handle: string) => void
  error: string | null
}) {
  const { isValidatingAuth, isLoggedIn, authState } = useContext(AuthContext)
  const [handle, setHandle] = useState('')

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

  useEffect(() => {
    const title = `Ozone - Authenticate`
    if (!isLoggedIn) {
      document.title = title
    }
  }, [isLoggedIn])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    signIn(handle)
  }

  if (isLoggedIn) {
    return <></>
  }
  return (
    <div className="fixed inset-0 z-20 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-rose-600 to-rose-800 dark:from-slate-700 dark:to-slate-900">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-700 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
          <div>
            <Image
              className="mx-auto h-20 w-auto"
              title="Icon from Flaticon: https://www.flaticon.com/free-icons/lifeguard-tower"
              src="/img/logo-colorful.png"
              alt="Ozone - Bluesky Admin"
              width={200}
              height={200}
            />
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-200">
              Bluesky Admin Tools
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-100">
              {authState === AuthState.LoggedInUnconfigured && (
                <>Configure your Ozone service</>
              )}
              {authState !== AuthState.LoggedInUnconfigured && (
                <>Sign into your account</>
              )}
            </p>
          </div>
          {authState === AuthState.LoggedInUnconfigured && (
            <ConfigurationFlow />
          )}
          {authState !== AuthState.LoggedInUnconfigured && (
            <form className="mt-8 space-y-6" onSubmit={onSubmit}>
              <input type="hidden" name="remember" defaultValue="true" />
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  <label htmlFor="account-handle" className="sr-only">
                    Account handle/Host
                  </label>
                  <Input
                    id="account-handle"
                    name="handle"
                    type="text"
                    required
                    disabled={isValidatingAuth}
                    className="w-full"
                    placeholder="Account handle/Host"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                  />
                </div>
              </div>

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
          )}
        </div>
      </div>
    </div>
  )
}
