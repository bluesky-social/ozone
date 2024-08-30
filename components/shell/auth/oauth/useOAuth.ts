'use client'

import {
  type BrowserOAuthClient,
  type BrowserOAuthClientLoadOptions,
  type OAuthSession,
} from '@atproto/oauth-client-browser'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useCallbackRef } from '@/lib/useCallbackRef'
import { useValueRef } from '@/lib/useValueRef'

export type Simplify<T> = { [K in keyof T]: T[K] } & {}
export type Gettable<T> = () => PromiseLike<T> | T

export type OAuthSignIn = (input: string) => unknown

export type OnRestored = (session: OAuthSession | null) => void
export type OnSignedIn = (session: OAuthSession, state: null | string) => void
export type OnSignedOut = () => void

type ClientOptions =
  | { client: BrowserOAuthClient }
  | Simplify<
      Partial<
        Pick<
          BrowserOAuthClientLoadOptions,
          | 'clientId'
          | 'handleResolver'
          | 'responseMode'
          | 'plcDirectoryUrl'
          | 'fetch'
        >
      >
    >

function useOAuthClient(options: ClientOptions): null | BrowserOAuthClient
function useOAuthClient(
  options: Partial<
    { client: BrowserOAuthClient } & BrowserOAuthClientLoadOptions
  >,
) {
  const {
    client: clientInput,
    clientId,
    handleResolver,
    responseMode,
    plcDirectoryUrl,
  } = options

  const [client, setClient] = useState<null | BrowserOAuthClient>(
    clientInput || null,
  )
  const fetch = useCallbackRef(options.fetch || globalThis.fetch)

  useEffect(() => {
    if (clientInput) {
      setClient(clientInput)
    } else if (clientId && handleResolver) {
      const ac = new AbortController()
      const { signal } = ac

      setClient(null)

      import('@atproto/oauth-client-browser').then((module) => {
        if (signal.aborted) return

        const { BrowserOAuthClient } = module

        BrowserOAuthClient.load({
          clientId,
          handleResolver,
          responseMode,
          plcDirectoryUrl,
          fetch,
          signal,
        }).then(
          (client) => {
            if (!signal.aborted) {
              signal.addEventListener('abort', () => client.dispose(), {
                once: true,
              })
              setClient(client)
            } else {
              client.dispose()
            }
          },
          (err) => {
            if (!signal.aborted) throw err
          },
        )
      })

      return () => ac.abort()
    } else {
      setClient(null)
    }
  }, [
    clientInput,
    clientId,
    handleResolver,
    responseMode,
    plcDirectoryUrl,
    fetch,
  ])

  return client
}

export type UseOAuthOptions = ClientOptions & {
  onRestored?: OnRestored
  onSignedIn?: OnSignedIn
  onSignedOut?: OnSignedOut

  state?: string
  scope?: string
}

export function useOAuth(options: UseOAuthOptions) {
  const onRestored = useCallbackRef(options.onRestored)
  const onSignedIn = useCallbackRef(options.onSignedIn)
  const onSignedOut = useCallbackRef(options.onSignedOut)

  const clientForInit = useOAuthClient(options)

  const scopeRef = useValueRef(options.scope)
  const stateRef = useValueRef(options.state)

  const [session, setSession] = useState<null | OAuthSession>(null)
  const [client, setClient] = useState<BrowserOAuthClient | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoginPopup, setIsLoginPopup] = useState(false)

  const clientForInitRef = useRef<typeof clientForInit>()
  useEffect(() => {
    // In strict mode, we don't want to re-init() the client if it's the same
    if (clientForInitRef.current === clientForInit) return
    clientForInitRef.current = clientForInit

    setSession(null)
    setClient(null)
    setIsLoginPopup(false)
    setIsInitializing(clientForInit != null)

    clientForInit
      ?.init()
      .then(
        async (r) => {
          if (clientForInitRef.current !== clientForInit) return

          setClient(clientForInit)
          if (r) {
            setSession(r.session)

            if ('state' in r) {
              await onSignedIn(r.session, r.state)
            } else {
              await onRestored(r.session)
            }
          } else {
            await onRestored(null)
          }
        },
        async (err) => {
          if (clientForInitRef.current !== clientForInit) return
          const { LoginContinuedInParentWindowError } = await import(
            '@atproto/oauth-client-browser'
          )
          if (err instanceof LoginContinuedInParentWindowError) {
            setIsLoginPopup(true)
            return
          }

          setClient(clientForInit)
          await onRestored(null)

          console.error('Failed to init:', err)
        },
      )
      .finally(() => {
        if (clientForInitRef.current !== clientForInit) return

        setIsInitializing(false)
      })
  }, [clientForInit, onSignedIn, onRestored])

  useEffect(() => {
    if (!client) return

    const controller = new AbortController()
    const { signal } = controller

    client.addEventListener(
      'updated',
      ({ detail: { sub } }) => {
        if (!session || session.did !== sub) {
          setSession(null)
          client.restore(sub, false).then((session) => {
            if (!signal.aborted) setSession(session)
          })
        }
      },
      { signal },
    )

    if (session) {
      client.addEventListener(
        'deleted',
        ({ detail: { sub } }) => {
          if (session.did === sub) {
            setSession(null)
            void onSignedOut()
          }
        },
        { signal },
      )
    }

    return () => {
      controller.abort()
    }
  }, [client, session, onSignedOut])

  // Memoize the return value to avoid re-renders in consumers
  return useMemo(
    () => ({
      isInitializing,
      isInitialized: client != null,
      isLoginPopup,

      client,
      session,

      signIn: client
        ? async (input) => {
            const state = stateRef.current
            const scope = scopeRef.current
            const session = await client.signIn(input, { scope, state })
            setSession(session)
            await onSignedIn(session, null)
            return session
          }
        : () => {
            throw new Error('Client not initialized')
          },
      signOut: () => session?.signOut(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isInitializing,
      isLoginPopup,
      session,
      client,
      // onSignedIn
      // stateRef
      // scopeRef
    ],
  )
}
