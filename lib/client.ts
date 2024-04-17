import {
  AppBskyActorDefs,
  AtpSessionData,
  ToolsOzoneModerationQueryStatuses,
} from '@atproto/api'
import { AuthState } from './types'
import { OzoneConfig, getConfig } from './client-config'
import { OAuthClient } from '@atproto/oauth-client'

export interface ClientSession extends Pick<AtpSessionData, 'handle' | 'did'> {
  config: OzoneConfig
  skipRecord: boolean
}

// exported api
// =

class ClientManager extends EventTarget {
  hasSetup = false
  private _agent: OAuthClient | undefined
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

  get session(): ClientSession {
    if (this._session) {
      return this._session
    }
    throw new Error('Not authed')
  }

  // this gets called by the login modal during initial render
  async setup(client: OAuthClient) {
    if (this.hasSetup) return this.authState
    this._session = _loadSession()
    this._agent = client
    this.hasSetup = true
    this._emit('change')
    return this.authState
  }

  async signin(agent: OAuthClient) {
    const userInfo = await agent.getUserinfo()
    console.log('signing in')
    const config = await this._getConfig()
    await this._checkCredentials(agent, userInfo.sub, config.did)
    this._session = {
      config,
      skipRecord: config.did !== userInfo.sub, // skip if not logged-in as service account
      handle: userInfo.userinfo.preferred_username?.replace('@', ''),
      did: userInfo.sub,
    }
    this._agent = agent
    _saveSession(this._session)
    this._emit('change')
    this.hasSetup = true
    return this.authState
  }

  async signout() {
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

  private async _getConfig(ozoneDid?: string) {
    const builtIn =
      ozoneDid ||
      process.env.NEXT_PUBLIC_OZONE_SERVICE_DID ||
      `did:plc:6utqfv3asdb7buu6iqvp6hza` ||
      undefined
    return await getConfig(builtIn)
  }

  private async _checkCredentials(
    agent: OAuthClient,
    accountDid: string,
    ozoneDid: string,
  ) {
    try {
      await agent.request(
        `/xrpc/tools.ozone.moderation.getRepo?${new URLSearchParams({
          did: accountDid,
        }).toString()}`,
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

  private _clear() {
    _deleteSession()
    this._agent = undefined
    this._session = undefined
  }

  private _emit(type: string) {
    this.dispatchEvent(new Event(type))
  }

  get api() {
    if (!this._agent) {
      throw new Error('Not authed')
    }

    return {
      app: {
        bsky: {
          actor: {
            getProfile: async (opts: { actor: string }) => {
              const res = await this._agent?.request(
                `/xrpc/tools.ozone.actor.getProfile?${new URLSearchParams(
                  opts,
                ).toString()}`,
              )
              const data =
                (await res?.json()) as AppBskyActorDefs.ProfileViewDetailed
              return { data }
            },
          },
        },
      },
      tools: {
        ozone: {
          moderation: {
            queryStatuses: async (
              params: ToolsOzoneModerationQueryStatuses.QueryParams,
            ) => {
              const query = {}
              Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                  query[key] = value
                }
              })
              const res = await this._agent?.request(
                `/xrpc/tools.ozone.moderation.queryStatuses?${new URLSearchParams(
                  query,
                ).toString()}`,
              )
              const data =
                (await res?.json()) as ToolsOzoneModerationQueryStatuses.OutputSchema
              return { data }
            },
          },
        },
      },
    }
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
    if (!obj.handle || !obj.did || !obj.config) {
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
