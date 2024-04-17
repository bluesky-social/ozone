import {
  AppBskyActorDefs,
  AtpSessionData,
  ToolsOzoneModerationQueryEvents,
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
    this.hasSetup = true
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
      `did:plc:uhpxfzh7exxkxf473m5r7hku` ||
      undefined
    return await getConfig(builtIn)
  }

  private async _checkCredentials(
    agent: OAuthClient,
    accountDid: string,
    ozoneDid: string,
  ) {
    try {
      await this.makeRequest('tools.ozone.moderation.getRepo', {
        did: accountDid,
      })
    } catch (err) {
      if (err?.['status'] === 401) {
        throw new Error(
          "Account does not have access to this Ozone service. If this seems in error, check Ozone's access configuration.",
        )
      }
    }
  }

  setup(_agent: OAuthClient) {
    this._agent = _agent
  }

  async makeRequest<Input extends Record<string, any>, Output>(
    endPoint: string,
    input?: Input,
  ): Promise<{ data: Output }> {
    let url = `/xrpc/${endPoint}`
    const params = new URLSearchParams()
    if (input) {
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, value)
      })
      url += `?${params.toString()}`
    }
    const res = await this._agent?.request(url, {
      headers: this.proxyHeaders(),
    })
    const data = (await res?.json()) as Output
    return { data }
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
              return this.makeRequest<
                { actor: string },
                AppBskyActorDefs.ProfileViewDetailed
              >('tools.ozone.actor.getProfile', opts)
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
              return this.makeRequest<
                ToolsOzoneModerationQueryStatuses.QueryParams,
                ToolsOzoneModerationQueryStatuses.OutputSchema
              >('tools.ozone.moderation.queryStatuses', params)
            },
            queryEvents: async (
              params: ToolsOzoneModerationQueryEvents.QueryParams,
            ) => {
              return this.makeRequest<
                ToolsOzoneModerationQueryEvents.QueryParams,
                ToolsOzoneModerationQueryEvents.OutputSchema
              >('tools.ozone.moderation.queryEvents', params)
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

function _ensureServiceId(did: string) {
  if (did.includes('#')) return did
  return `${did}#atproto_labeler`
}
