import { AtpAgent, AtpServiceClient, AtpSessionData } from '@atproto/api'

interface ClientSession extends AtpSessionData {
  service: string
  adminToken: string
}

// exported api
// =

class ClientManager extends EventTarget {
  hasSetup = false
  private _agent: AtpAgent | undefined
  private _session: ClientSession | undefined

  get isAuthed() {
    return !!this._agent && !!this._session
  }

  get api(): AtpServiceClient {
    if (this._agent) {
      return this._agent.api
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
  async setup() {
    if (this.hasSetup) return
    this._session = _loadSession()
    await this._setup()
    this.hasSetup = true
    this._emit('change')
  }

  async signin(
    service: string,
    handle: string,
    password: string,
    adminToken: string,
  ) {
    const agent = new AtpAgent({
      service,
      persistSession: (_type, session) => {
        this._onSessionChange(session)
      },
    })
    const { data: login } = await agent.login({
      identifier: handle,
      password,
    })
    // Check validity of admin token
    await agent.api.com.atproto.admin.getRepo(
      { did: login.did },
      { headers: this.adminHeaders(adminToken) },
    )
    this._session = {
      service,
      accessJwt: login.accessJwt,
      refreshJwt: login.refreshJwt,
      handle: login.handle,
      did: login.did,
      adminToken,
    }
    this._agent = agent
    _saveSession(this._session)
    this._emit('change')
  }

  async signout() {
    try {
      this._agent?.api.com.atproto.server.deleteSession()
    } catch (err) {
      console.error('(Minor issue) Failed to delete session on the server', err)
    }
    this._clear()
    this._emit('change')
  }

  adminHeaders(override?: string) {
    const adminToken = override ?? this.session.adminToken
    return { authorization: `Basic ${btoa(`admin:${adminToken}`)}` }
  }

  private async _setup() {
    if (this._session) {
      const agent = new AtpAgent({
        service: this._session.service,
        persistSession: (_type, session) => {
          this._onSessionChange(session)
        },
      })
      await agent.resumeSession(this._session)
      this._agent = agent
    } else {
      this._agent = undefined
    }
  }

  private _onSessionChange(newSession?: AtpSessionData) {
    if (newSession && this._session) {
      Object.assign(this._session, newSession)
      _saveSession(this._session)
    } else {
      this._clear()
      this._emit('change')
    }
  }

  private _clear() {
    _deleteSession()
    this._agent = undefined
    this._session = undefined
  }

  private _emit(type: string) {
    this.dispatchEvent(new Event(type))
  }
}
const clientManager = new ClientManager()
export default clientManager

// For debugging and low-level access
;(globalThis as any).client = clientManager

// helpers
// =

const SESSION_KEY = 'redsky_session'

function _loadSession(): ClientSession | undefined {
  try {
    const str = localStorage.getItem(SESSION_KEY)
    const obj = str ? JSON.parse(str) : undefined
    if (!obj || typeof obj === 'undefined') {
      return undefined
    }
    if (
      !obj.service ||
      !obj.refreshJwt ||
      !obj.accessJwt ||
      !obj.adminToken ||
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
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function _deleteSession() {
  localStorage.removeItem(SESSION_KEY)
}
