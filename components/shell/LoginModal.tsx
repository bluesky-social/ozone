'use client'
import Image from 'next/image'
import {
  FormEvent,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from 'react'
import { LockClosedIcon, XCircleIcon } from '@heroicons/react/20/solid'
import { AuthChangeContext, AuthContext } from './AuthContext'
import { AuthState } from '@/lib/types'
import Client from '@/lib/client'
import { ConfigurationFlow } from './ConfigurationFlow'
import { ErrorInfo } from '@/common/ErrorInfo'
import { OAuthAuthorizeOptions, OAuthClient } from '@atproto/oauth-client'
import {
  BrowserOAuthClientFactory,
  LoginContinuedInParentWindowError,
} from '@atproto/oauth-client-browser'
import { oauthClientMetadataSchema } from '@atproto/oauth-client-metadata'

const CURRENT_SESSION_ID_KEY = 'CURRENT_SESSION_ID_KEY'

export function useOAuth(factory: BrowserOAuthClientFactory) {
  const [initialized, setInitialized] = useState(false)
  const [client, setClient] = useState<undefined | null | OAuthClient>(void 0)
  const [clients, setClients] = useState<{ [_: string]: OAuthClient }>({})
  const [error, setError] = useState<null | string>(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<undefined | string>(undefined)

  const semaphore = useRef(0)

  useEffect(() => {
    if (client != null) {
      localStorage.setItem(CURRENT_SESSION_ID_KEY, client.sessionId)
    } else if (client === null) {
      localStorage.removeItem(CURRENT_SESSION_ID_KEY)
    }
  }, [client])

  useEffect(() => {
    semaphore.current++

    setInitialized(false)
    setClient(undefined)
    setClients({})
    setError(null)
    setLoading(true)
    setState(undefined)

    const sessionId = localStorage.getItem(CURRENT_SESSION_ID_KEY)
    factory
      .init(sessionId || undefined)
      .then(async (r) => {
        const clients = await factory.restoreAll().catch((err) => {
          console.error('Failed to restore clients:', err)
          return {}
        })
        setInitialized(true)
        setClients(clients)
        setClient(r?.client || (sessionId && clients[sessionId]) || null)
        setState(r?.state)
      })
      .catch((err) => {
        localStorage.removeItem(CURRENT_SESSION_ID_KEY)
        console.error('Failed to init:', err)
        setError(String(err))
        setInitialized(!(err instanceof LoginContinuedInParentWindowError))
      })
      .finally(() => {
        setLoading(false)
        semaphore.current--
      })
  }, [semaphore, factory])

  const signOut = useCallback(async () => {
    if (!client) return

    if (semaphore.current) return
    semaphore.current++

    setClient(null)
    setError(null)
    setLoading(true)
    setState(undefined)

    try {
      await client.signOut()
    } catch (err) {
      console.error('Failed to clear credentials', err)
      if (semaphore.current === 1) setError(String(err))
    } finally {
      if (semaphore.current === 1) setLoading(false)
      semaphore.current--
    }
  }, [semaphore, client])

  const signIn = useCallback(
    async (input: string, options?: OAuthAuthorizeOptions) => {
      if (client) return

      if (semaphore.current) return
      semaphore.current++

      setLoading(true)

      try {
        const client = await factory.signIn(input, options)
        setClient(client)
      } catch (err) {
        console.error('Failed to login', err)
        if (semaphore.current === 1) setError(String(err))
      } finally {
        if (semaphore.current === 1) setLoading(false)
        semaphore.current--
      }
    },
    [semaphore, client, factory],
  )

  return {
    initialized,
    clients,
    client: client ?? null,
    state,
    loading,
    error,
    signedIn: client != null,
    signIn,
    signOut,
  }
}

export const oauthFactory = new BrowserOAuthClientFactory({
  clientMetadata: oauthClientMetadataSchema.parse({
    client_id: 'http://localhost/',
    redirect_uris: ['http://127.0.0.1:5173/'],
    response_types: ['code id_token', 'code'],
  }),
  responseMode: 'fragment',
  plcDirectoryUrl: 'http://localhost:2582', // dev-env
  atprotoLexiconUrl: 'http://localhost:2584', // dev-env (bsky appview)
})

export function LoginModal(oauthFactory) {
  const {
    initialized,
    client,
    signedIn,
    signOut,
    error: authError,
    loading,
    signIn,
  } = useOAuth(oauthFactory)
  const { isValidatingAuth, isLoggedIn, authState } = useContext(AuthContext)
  const setAuthContextData = useContext(AuthChangeContext)
  const [error, setError] = useState('')
  const [service, setService] = useState('https://bsky.social')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')

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
    if (!Client.hasSetup) {
      Client.setup()
        .then((authState) => setAuthContextData(authState))
        .catch(() => setAuthContextData(AuthState.LoggedOut))
    }
  }, [])

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
    // try {
    //   setAuthContextData(AuthState.Validating)
    //   const authState = await Client.signin(service, handle, password)
    //   setAuthContextData(authState)
    // } catch (e: any) {
    //   console.error(e)
    //   setError(e.toString())
    // }
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
                    className="relative block w-full appearance-none rounded-none border border-gray-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 dark:focus:ring-slate-500 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
