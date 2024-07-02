'use client'

import { AppBskyActorDefs, BskyAgent } from '@atproto/api'
import { isLoopbackHost } from '@atproto/oauth-client-browser'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Loading } from '@/common/Loader'
import { SetupModal } from '@/common/SetupModal'
import { useAtpAuth } from './auth/atp/useAtpAuth'
import { useOAuth, UseOAuthOptions } from './auth/oauth/useOAuth'
import { AuthForm } from './AuthForm'

export type Profile = AppBskyActorDefs.ProfileViewDetailed

export type AuthContext = {
  pdsAgent: BskyAgent
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContext | null>(null)

export const AuthProvider = ({
  children,
  ...options
}: {
  children: ReactNode
} & UseOAuthOptions) => {
  const pathname = usePathname()
  const router = useRouter()

  const {
    isLoginPopup,
    isInitializing,
    client: oauthClient,
    agent: oauthAgent,
    signIn: oauthSignIn,
  } = useOAuth({
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

  const {
    session: atpSession,
    signIn: atpSignIn,
    signOut: atpSignOut,
  } = useAtpAuth()

  const value = useMemo<AuthContext | null>(
    () =>
      oauthAgent
        ? {
            pdsAgent: new BskyAgent(oauthAgent),
            signOut: () => oauthAgent.signOut(),
          }
        : atpSession
        ? {
            pdsAgent: new BskyAgent(atpSession),
            signOut: atpSignOut,
          }
        : null,
    [atpSession, oauthAgent, atpSignOut],
  )

  if (isLoginPopup) {
    return (
      <SetupModal>
        <p className="text-center">This window can be closed</p>
      </SetupModal>
    )
  }

  if (!value && isInitializing) {
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
          atpSignIn={atpSignIn}
          oauthSignIn={oauthClient ? oauthSignIn : undefined}
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
  return pdsAgent.getDid()
}

export const useAuthProfileQuery = () => {
  const { pdsAgent } = useAuthContext()
  const did = pdsAgent.getDid()

  return useQuery({
    queryKey: ['profile', did],
    queryFn: async () => pdsAgent.getProfile({ actor: did }),
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
