import { useState, useEffect } from 'react'
import {
  sessionClient as AtpApi,
  SessionServiceClient,
  Session as AtpSession,
} from '@atproto/api'

interface ClientSession {
  service: string
  refreshJwt: string
  accessJwt: string
  handle: string
  did: string
}

// exported api
// =

class ClientManager extends EventTarget {
  hasSetup = false
  private _api: SessionServiceClient | undefined
  private _session: ClientSession | undefined

  get isAuthed() {
    return !!this._api && !!this._session
  }

  get api(): SessionServiceClient {
    if (this._api) {
      return this._api
    }
    throw new Error('Not authed')
  }

  get session(): ClientSession {
    if (this._session) {
      return this._session
    }
    throw new Error('Not authed')
  }

  // this gets called by the login modal during initial render
  setup() {
    if (this.hasSetup) return
    this._session = _loadSession()
    this._setup()
    this.hasSetup = true
    this._emit('change')
  }

  async signin(service: string, handle: string, password: string) {
    this._api = AtpApi.service(service)
    const res = await this._api.com.atproto.session.create({ handle, password })
    if (res.data.accessJwt && res.data.refreshJwt) {
      this._session = {
        service: service,
        accessJwt: res.data.accessJwt,
        refreshJwt: res.data.refreshJwt,
        handle: res.data.handle,
        did: res.data.did,
      }
      this._emit('change')
      _saveSession(this._session)
      this._api.sessionManager.on('session', this._onSessionChange.bind(this))
    }
  }

  async signout() {
    if (this.isAuthed) {
      this._api?.com.atproto.session.delete().catch((e: any) => {
        console.error('(Minor issue) Failed to delete session on the server', e)
      })
    }
    this._emit('change')
    this._clear()
  }

  private _setup() {
    if (this._session) {
      this._api = AtpApi.service(this._session.service)
      this._api.sessionManager.set({
        refreshJwt: this._session.refreshJwt,
        accessJwt: this._session.accessJwt,
      })
      this._api.sessionManager.on('session', this._onSessionChange.bind(this))
    } else {
      this._api = undefined
    }
  }

  private _onSessionChange(newSession: AtpSession | undefined) {
    if (newSession && this._session) {
      this._session.accessJwt = newSession.accessJwt
      this._session.refreshJwt = newSession.refreshJwt
      _saveSession(this._session)
    } else {
      this._api?.sessionManager.removeAllListeners('session')
      this._emit('change')
      this._clear()
    }
  }

  private _clear() {
    _deleteSession()
    this._api = undefined
    this._session = undefined
  }

  private _emit(type: string) {
    this.dispatchEvent(new Event(type))
  }
}
const clientManager = new ClientManager()
export default clientManager

export function useApi() {
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    setIsAuthed(clientManager.isAuthed)
    const onClientChange = () => setIsAuthed(clientManager.isAuthed)
    clientManager.addEventListener('change', onClientChange)
    return () => clientManager.removeEventListener('change', onClientChange)
  }, [])

  return isAuthed ? clientManager.api : undefined
}

// helpers
// =

function _loadSession(): ClientSession | undefined {
  try {
    const str = localStorage.getItem('session')
    const obj = str ? JSON.parse(str) : undefined
    if (!obj || typeof obj === 'undefined') {
      return undefined
    }
    if (
      !obj.service ||
      !obj.refreshJwt ||
      !obj.accessJwt ||
      !obj.handle ||
      !obj.did
    ) {
      return undefined
    }
    return obj as ClientSession
  } catch (e) {
    return undefined
  }
}

function _saveSession(session: ClientSession) {
  localStorage.setItem('session', JSON.stringify(session))
}

function _deleteSession() {
  localStorage.removeItem('session')
}
