'use client'

import { useState, useEffect, useContext } from 'react'
import { OAuthAuthorizeOptions, OAuthClient } from '@atproto/oauth-client'
import {
  BrowserOAuthClientFactory,
  LoginContinuedInParentWindowError,
} from '@atproto/oauth-client-browser'
import { oauthClientMetadataSchema } from '@atproto/oauth-client-metadata'
import { PLC_DIRECTORY_URL } from '@/lib/constants'
import { AuthChangeContext, AuthState } from './AuthContext'
import clientManager from '@/lib/client'

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

type AuthType = {
  hasInitialized: boolean
  client: OAuthClient | null
  error: null | string
  isLoading: boolean
  state?: string
}

export function useAuth() {
  const setAuthContextData = useContext(AuthChangeContext)
  const [auth, setAuth] = useState<AuthType>({
    hasInitialized: false,
    client: null,
    error: null,
    isLoading: false,
  })

  useEffect(() => {
    if (!auth.hasInitialized) return
    if (auth.client != null) {
      localStorage.setItem(CURRENT_SESSION_ID_KEY, auth.client.sessionId)
    } else if (auth.client === null) {
      localStorage.removeItem(CURRENT_SESSION_ID_KEY)
    }
  }, [auth.client, auth.hasInitialized])

  useEffect(() => {
    if (!factory) return

    setAuth({
      hasInitialized: false,
      client: null,
      error: null,
      isLoading: true,
      state: undefined,
    })

    const sessionId = localStorage.getItem(CURRENT_SESSION_ID_KEY)
    factory
      .init(sessionId || undefined)
      .then(async (r) => {
        const clients = await factory.restoreAll().catch((err) => {
          console.error('Failed to restore clients:', err)
          return {}
        })
        const client = r?.client || (sessionId && clients[sessionId]) || null
        setAuth({
          client,
          error: null,
          state: r?.state,
          isLoading: false,
          hasInitialized: true,
        })
        clientManager.setup(client)
        setAuthContextData(client ? AuthState.LoggedIn : AuthState.LoggedOut)
        if (client && location.pathname === '/') {
          location.pathname = '/reports'
        }
      })
      .catch((err) => {
        localStorage.removeItem(CURRENT_SESSION_ID_KEY)
        console.error('Failed to init:', err)
        setAuth({
          error: String(err),
          isLoading: false,
          hasInitialized: !(err instanceof LoginContinuedInParentWindowError),
          client: null,
        })
        setAuthContextData(AuthState.LoggedOut)
      })
  }, [])

  const signOut = async () => {
    if (!auth.client) return

    setAuth({
      ...auth,
      client: null,
      error: null,
      isLoading: true,
      state: undefined,
    })

    try {
      await auth.client.signOut()
    } catch (err) {
      console.log('minor issue cleaning up log out state')
    }
  }

  const signIn = async (input: string, options?: OAuthAuthorizeOptions) => {
    if (!factory || auth.client) return

    setAuth({ ...auth, isLoading: true, error: null })

    try {
      const client = await factory.signIn(input, options)
      setAuth({ ...auth, client, isLoading: false })
    } catch (err) {
      setAuth({ ...auth, error: String(err), isLoading: false })
    }
  }

  return {
    ...auth,
    signedIn: auth.client != null,
    signIn,
    signOut,
  }
}
