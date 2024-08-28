'use client'

import { AppBskyActorDefs, Agent } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, ReactNode, useContext, useMemo } from 'react'

import { Loading } from '@/common/Loader'
import { SetupModal } from '@/common/SetupModal'
import { useCredential } from './auth/credential/useCredential'
import { useOAuth, UseOAuthOptions } from './auth/oauth/useOAuth'
import { AuthForm } from './AuthForm'

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

export const AuthProvider = ({ children, ...options }: AuthProviderProps) => {
  const pathname = usePathname()
  const router = useRouter()

  const oauth = useOAuth({
    ...options,

    getState: async () => {
      // Save the current path before signing in
      return pathname
    },
    onSignedIn: async (agent, state) => {
      // Restore the previous path after signing in
      if (state) router.push(state)
    },

    // use "https://ozone.example.com/oauth-client.json" in prod and a loopback URL in dev
    clientId:
      options['clientId'] ??
      (options['clientMetadata'] == null
        ? typeof window === 'undefined' ||
          isLoopbackHost(window.location.hostname)
          ? undefined
          : new URL(`/oauth-client.json`, window.location.origin).href
        : undefined),
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
          oauthSignIn={oauth.client ? oauth.signIn : undefined}
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
    queryFn: async () =>
      pdsAgent.getProfile({ actor: did }).catch((err) => {
        console.error('Failed to fetch profile', err)
        throw err
      }),
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
