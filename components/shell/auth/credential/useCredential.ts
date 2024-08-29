import { AtpSessionData, CredentialSession } from '@atproto/api'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Session = AtpSessionData & { service: string }

export function useCredential() {
  const createSession = useCallback((service: string) => {
    const persistSession = (type, session) => {
      if (session) {
        saveSession({ ...session, service })
      } else {
        setSession(null)
        deleteSession()
      }
    }
    return new CredentialSession(new URL(service), undefined, persistSession)
  }, [])

  const [session, setSession] = useState<null | CredentialSession>(null)

  useEffect(() => {
    const prev = loadSession()
    if (!prev) return

    const session = createSession(prev.service)
    session.resumeSession(prev).then(() => setSession((s) => s || session))
  }, [])

  const signIn = useCallback(
    async ({
      identifier,
      password,
      authFactorToken,
      service,
    }: {
      identifier: string
      password: string
      authFactorToken?: string
      service: string
    }) => {
      const session = createSession(service)
      await session.login({ identifier, password, authFactorToken })
      setSession(session)
    },
    [createSession],
  )

  return useMemo(
    () => ({ session, signIn, signOut: () => session?.logout() }),
    [session, signIn],
  )
}

const SESSION_KEY = '@@ATPROTO/SESSION'

function loadSession(): Session | undefined {
  try {
    const str = localStorage.getItem(SESSION_KEY)
    const obj: unknown = str ? JSON.parse(str) : undefined
    if (
      obj &&
      obj['service'] &&
      obj['refreshJwt'] &&
      obj['accessJwt'] &&
      obj['handle'] &&
      obj['did']
    ) {
      return obj as Session
    }
    return undefined
  } catch (e) {
    return undefined
  }
}

function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function deleteSession() {
  localStorage.removeItem(SESSION_KEY)
}
