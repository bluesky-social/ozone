'use client'

import { Agent, AppBskyActorDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, ReactNode, useContext, useMemo } from 'react'

import { Loading } from '@/common/Loader'
import { SetupModal } from '@/common/SetupModal'
import { OAUTH_SCOPE, OZONE_PUBLIC_URL } from '@/lib/constants'
import { OAuthClientIdLoopback } from '@atproto/oauth-types'
import { useCredential } from './auth/credential/useCredential'
import { useOAuth, UseOAuthOptions } from './auth/oauth/useOAuth'
import { AuthForm } from './AuthForm'
import { useConfigContext } from './ConfigContext'

export type Profile = AppBskyActorDefs.ProfileViewDetailed

export type AuthContext = {
  pdsAgent: Agent
  signOut: () => void | Promise<void>
}

const AuthContext = createContext<AuthContext | null>(null)

const isLoopbackHost = (host: string) => {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

export type AuthProviderProps = {
  children: ReactNode
} & UseOAuthOptions

const ozonePublicUrl = OZONE_PUBLIC_URL
  ? new URL(OZONE_PUBLIC_URL)
  : typeof window !== 'undefined'
  ? new URL(window.location.origin)
  : undefined

export function AuthProvider({ children, ...options }: AuthProviderProps) {
  const { config } = useConfigContext()

  const pathname = usePathname()
  const router = useRouter()

  const oauth = useOAuth({
    ...options,

    state: pathname,
    scope: OAUTH_SCOPE, // Won't be needed in future version of the oauth-client (as it will default to the metadata value)

    onSignedIn: async (agent, state) => {
      // Restore the previous path after signing in
      if (state) router.push(state)
    },

    clientId:
      !ozonePublicUrl || typeof window === 'undefined'
        ? undefined // Disabled server side
        : isLoopbackHost(ozonePublicUrl.hostname)
        ? // The following requires a yet to be released version of the oauth-client:
          // &scope=${OAUTH_SCOPE.split(' ').map(encodeURIComponent).join('+')}
          `http://localhost?redirect_uri=${encodeURIComponent(
            new URL(
              `http://127.0.0.1${
                window.location.port ? `:${window.location.port}` : ''
              }`,
            ).href,
          )}`
        : `${ozonePublicUrl.origin as `https://${string}`}/oauth-client.json`,
  })

  const credential = useCredential()

  const auth = oauth.session ? oauth : credential
  const value = useMemo<AuthContext | null>(() => {
    if (auth.session) {
      return {
        pdsAgent: new Agent(auth.session),
        signOut: auth.signOut,
      }
    }

    return null
  }, [auth.session, auth.signOut])

  if (oauth.isLoginPopup) {
    return (
      <SetupModal>
        <p className="text-center">This window can be closed</p>
      </SetupModal>
    )
  }

  if (oauth.isInitializing || !oauth.client) {
    return (
      <SetupModal>
        <Loading message="Initializing..." />
      </SetupModal>
    )
  }

  if (!value) {
    return (
      <SetupModal>
        <AuthForm
          credentialSignIn={credential.signIn}
          oauthSignIn={
            oauth.client && !config.needs.service ? oauth.signIn : undefined
          }
        />
      </SetupModal>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContext {
  const context = useContext(AuthContext)
  if (context) return context

  throw new Error(`useAuthContext() must be used within an <AuthProvider />`)
}

export function usePdsAgent() {
  return useAuthContext().pdsAgent
}

export const useAuthDid = () => {
  const { pdsAgent } = useAuthContext()
  return pdsAgent.assertDid
}

export const useAuthProfileQuery = () => {
  const { pdsAgent } = useAuthContext()
  const did = pdsAgent.assertDid

  return useQuery({
    queryKey: ['profile', did],
    queryFn: async () => pdsAgent.getProfile({ actor: did }),
    refetchOnWindowFocus: false,
  })
}

export const useAuthProfile = () => {
  const profileQuery = useAuthProfileQuery()
  return profileQuery.data?.data
}

export const useAuthHandle = () => {
  return useAuthProfile()?.handle
}

export const useAuthIdentifier = () => {
  const handle = useAuthHandle()
  const did = useAuthDid()
  return handle ?? did
}
