'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

import { OAuthAuthorizeOptions, OAuthClient } from '@atproto/oauth-client'
import {
  BrowserOAuthClientFactory,
  LoginContinuedInParentWindowError,
} from '@atproto/oauth-client-browser'
import { oauthClientMetadataSchema } from '@atproto/oauth-client-metadata'
import { PLC_DIRECTORY_URL } from '@/lib/constants'

const CURRENT_SESSION_ID_KEY = 'CURRENT_SESSION_ID_KEY'
const factory =
  typeof window === 'undefined'
    ? null
    : new BrowserOAuthClientFactory({
        clientMetadata: oauthClientMetadataSchema.parse({
          client_id: 'http://localhost/',
          redirect_uris: ['http://127.0.0.1:3000'],
          response_types: ['code id_token', 'code'],
        }),
        responseMode: 'query',
        plcDirectoryUrl: PLC_DIRECTORY_URL, // dev-env
        atprotoLexiconUrl: 'http://localhost:2584', // dev-env (bsky appview)
      })

export function useOAuth() {
  //   const [factory, setFactory] = useState<null | BrowserOAuthClientFactory>(null)
  const [initialized, setInitialized] = useState(false)
  const [client, setClient] = useState<undefined | null | OAuthClient>(void 0)
  const [clients, setClients] = useState<{ [_: string]: OAuthClient }>({})
  const [error, setError] = useState<null | string>(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<undefined | string>(undefined)

  const semaphore = useRef(0)

  //   useEffect(() => {
  //     setFactory(oauthFactory)
  //   }, [setFactory])

  useEffect(() => {
    if (client != null) {
      console.log('setting session id', client.sessionId)
      localStorage.setItem(CURRENT_SESSION_ID_KEY, client.sessionId)
    } else if (client === null) {
      console.log('removing session id')
      //   localStorage.removeItem(CURRENT_SESSION_ID_KEY)
    }
  }, [client])

  useEffect(() => {
    if (!factory) return

    semaphore.current++

    setInitialized(false)
    setClient(undefined)
    setClients({})
    setError(null)
    setLoading(true)
    setState(undefined)

    const sessionId = localStorage.getItem(CURRENT_SESSION_ID_KEY)
    console.log(sessionId)
    factory
      .init(sessionId || undefined)
      .then(async (r) => {
        const clients = await factory.restoreAll().catch((err) => {
          console.error('Failed to restore clients:', err)
          return {}
        })
        console.log('init from sessionId', sessionId, r)
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
      if (!factory) return
      if (client) return

      if (semaphore.current) return
      semaphore.current++

      setLoading(true)

      try {
        const client = await factory.signIn(input, options)
        setClient(client)
        console.log('logged in', client)
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
