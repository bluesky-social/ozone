import { AtpAgent, AtpServiceClient, AtpSessionData } from '@atproto/api'
import { AuthState } from './types'
import { OzoneConfig, getConfig } from './client-config'

export interface ClientSession extends AtpSessionData {
  service: string
  // @TODO consider backwards compat of local storage state
  config: OzoneConfig
  skipRecord: boolean
}

// exported api
// =

class ClientManager extends EventTarget {
  hasSetup = false
  private _agent: AtpAgent | undefined
  private _session: ClientSession | undefined

  get authState() {
    if (!this._agent || !this._session) {
      return AuthState.LoggedOut
    }
    const { config, skipRecord } = this._session
    if (
      config.needs.key ||
      config.needs.service ||
      (!skipRecord && config.needs.record)
    ) {
      return AuthState.LoggedInUnconfigured
    }
    return AuthState.LoggedIn
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
    if (this.hasSetup) return this.authState
    this._session = _loadSession()
    await this._setup()
    this.hasSetup = true
    this._emit('change')
    return this.authState
  }

  async signin(service: string, handle: string, password: string) {
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
    const config = await this._getConfig()
    await this._checkCredentials(agent, login.did, config.did)
    this._session = {
      service,
      config,
      skipRecord: config.did !== login.did, // skip if not logged-in as service account
      accessJwt: login.accessJwt,
      refreshJwt: login.refreshJwt,
      handle: login.handle,
      did: login.did,
    }
    this._agent = agent
    _saveSession(this._session)
    this._emit('change')
    return this.authState
  }

  async signout() {
    try {
      this._agent?.api.com.atproto.server.deleteSession(undefined, {
        headers: {
          authorization: `Bearer ${this.session.refreshJwt}`,
        },
      })
    } catch (err) {
      console.error('(Minor issue) Failed to delete session on the server', err)
    }
    this._clear()
    this._emit('change')
    return this.authState
  }

  async reconfigure(opts?: { skipRecord?: boolean }) {
    if (!this._session) return
    const config = await this._getConfig(this._session.config.did)
    this._session = {
      ...this._session,
      config,
      skipRecord: opts?.skipRecord ?? this._session.skipRecord,
    }
    _saveSession(this._session)
    this._emit('change')
    return this.authState
  }

  proxyHeaders(override?: string): Record<string, string> {
    const proxy = override ?? this._session?.config.did
    return proxy ? { 'atproto-proxy': _ensureServiceId(proxy) } : {}
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

  private async _getConfig(ozoneDid?: string) {
    const builtIn =
      ozoneDid || process.env.NEXT_PUBLIC_OZONE_SERVICE_DID || undefined
    return await getConfig(builtIn)
  }

  private async _checkCredentials(
    agent: AtpAgent,
    accountDid: string,
    ozoneDid: string,
  ) {
    try {
      await agent.api.tools.ozone.moderation.getRepo(
        { did: accountDid },
        { headers: this.proxyHeaders(ozoneDid) },
      )
    } catch (err) {
      if (err?.['status'] === 401) {
        throw new Error(
          "Account does not have access to this Ozone service. If this seems in error, check Ozone's access configuration.",
        )
      }
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

const SESSION_KEY = 'ozone_session'

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
      !obj.handle ||
      !obj.did ||
      !obj.config
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

function _ensureServiceId(did: string) {
  if (did.includes('#')) return did
  return `${did}#atproto_labeler`
}
