import { Agent, CredentialSession } from '@atproto/api'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const resolveDidDocData = vi.hoisted(() => vi.fn())
vi.mock('@/lib/identity', () => ({ resolveDidDocData }))

import { listRecords } from './api'

// The Blocks tab reads an account's records from its PDS.
// On the moderator's own PDS that read carries the moderator's session; on
// any other host it stays anonymous and the token never leaves.

const MOD_PDS = 'https://pds.example'
const SUBJECT = 'did:plc:subject'
const COLLECTION = 'app.bsky.graph.block'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const docWithPds = (endpoint: string) => ({
  did: SUBJECT,
  alsoKnownAs: [],
  verificationMethods: {},
  services: { atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint } },
})

const signedIn = (sessionFetch: typeof fetch) => {
  const session = new CredentialSession(new URL(MOD_PDS), sessionFetch)
  session.session = {
    did: 'did:plc:moderator',
    handle: 'mod.example',
    accessJwt: 'access-1',
    refreshJwt: 'refresh-1',
    active: true,
  }
  return new Agent(session)
}

const requestOf = (mock: ReturnType<typeof vi.fn>, call = 0) =>
  mock.mock.calls[call][0] as Request

// The session hands its fetch a Request for reads and a URL plus init for its
// own refresh call; read either form.
const seen = (input: RequestInfo | URL, init?: RequestInit) => {
  const req = input instanceof Request ? input : new Request(input, init)
  return { url: new URL(req.url), authorization: req.headers.get('authorization') }
}

describe('listRecords', () => {
  const anonFetch = vi.fn()

  beforeEach(() => {
    anonFetch.mockReset()
    resolveDidDocData.mockReset()
    vi.stubGlobal('fetch', anonFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads through the moderator session when the account is on the moderator PDS', async () => {
    resolveDidDocData.mockResolvedValue(docWithPds(MOD_PDS))
    const sessionFetch = vi.fn(async () =>
      json({ records: [{ uri: 'at://x', value: {} }], cursor: 'c2' }),
    )

    const data = await listRecords(
      SUBJECT,
      COLLECTION,
      { cursor: 'c1' },
      { pdsAgent: signedIn(sessionFetch) },
    )

    expect(data).toEqual({ records: [{ uri: 'at://x', value: {} }], cursor: 'c2' })
    expect(anonFetch).not.toHaveBeenCalled()
    expect(sessionFetch).toHaveBeenCalledTimes(1)
    const req = requestOf(sessionFetch)
    const url = new URL(req.url)
    expect(url.origin).toBe(MOD_PDS)
    expect(url.pathname).toBe('/xrpc/com.atproto.repo.listRecords')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      repo: SUBJECT,
      collection: COLLECTION,
      limit: '25',
      cursor: 'c1',
    })
    expect(req.headers.get('authorization')).toBe('Bearer access-1')
    // A redirect must fail, not be followed with the token attached.
    expect(req.redirect).toBe('error')
  })

  it('treats a trailing slash or path on the PDS endpoint as the same PDS', async () => {
    resolveDidDocData.mockResolvedValue(docWithPds(`${MOD_PDS}/`))
    const sessionFetch = vi.fn(async () => json({ records: [] }))

    await listRecords(SUBJECT, COLLECTION, {}, { pdsAgent: signedIn(sessionFetch) })

    expect(sessionFetch).toHaveBeenCalledTimes(1)
    expect(anonFetch).not.toHaveBeenCalled()
  })

  it('passes the abort signal on the session read', async () => {
    resolveDidDocData.mockResolvedValue(docWithPds(MOD_PDS))
    const sessionFetch = vi.fn(async () => json({ records: [] }))
    const controller = new AbortController()

    await listRecords(
      SUBJECT,
      COLLECTION,
      {},
      { pdsAgent: signedIn(sessionFetch), signal: controller.signal },
    )

    const req = requestOf(sessionFetch)
    expect(req.signal.aborted).toBe(false)
    controller.abort()
    expect(req.signal.aborted).toBe(true)
  })

  it.each([
    ['another host', 'https://other-pds.test'],
    ['a host that starts with the moderator PDS name', 'https://pds.example.evil.test'],
    ['the moderator PDS name in the userinfo', 'https://pds.example@evil.test'],
    ['the moderator PDS name in the path', 'https://evil.test/pds.example'],
    ['another port', 'https://pds.example:8443'],
    ['another scheme', 'http://pds.example'],
  ])('stays anonymous and sends no token to %s', async (_name, endpoint) => {
    resolveDidDocData.mockResolvedValue(docWithPds(endpoint))
    anonFetch.mockResolvedValue(json({ records: [], cursor: undefined }))
    const sessionFetch = vi.fn(async () => json({ records: [] }))

    const data = await listRecords(
      SUBJECT,
      COLLECTION,
      {},
      { pdsAgent: signedIn(sessionFetch) },
    )

    expect(data).toEqual({ records: [] })
    expect(sessionFetch).not.toHaveBeenCalled()
    expect(anonFetch).toHaveBeenCalledTimes(1)
    const [url, init] = anonFetch.mock.calls[0] as [URL, RequestInit]
    expect(url.origin).toBe(new URL(endpoint).origin)
    expect(url.origin).not.toBe(MOD_PDS)
    expect(url.pathname).toBe('/xrpc/com.atproto.repo.listRecords')
    expect(new Headers(init.headers).has('authorization')).toBe(false)
  })

  it('stays anonymous with no agent, as before', async () => {
    resolveDidDocData.mockResolvedValue(docWithPds(MOD_PDS))
    anonFetch.mockResolvedValue(json({ records: [] }))
    const controller = new AbortController()

    await listRecords(SUBJECT, COLLECTION, { limit: 10 }, { signal: controller.signal })

    expect(anonFetch).toHaveBeenCalledTimes(1)
    const [url, init] = anonFetch.mock.calls[0] as [URL, RequestInit]
    expect(url.href).toBe(
      `${MOD_PDS}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(
        SUBJECT,
      )}&collection=${COLLECTION}&limit=10`,
    )
    expect(init.signal).toBe(controller.signal)
    expect(new Headers(init.headers).has('authorization')).toBe(false)
  })

  it('stays anonymous when the session is not a credential session', async () => {
    resolveDidDocData.mockResolvedValue(docWithPds(MOD_PDS))
    anonFetch.mockResolvedValue(json({ records: [] }))
    const otherFetch = vi.fn(async () => json({ records: [] }))
    const agent = new Agent({ did: 'did:plc:moderator', fetchHandler: otherFetch })

    await listRecords(SUBJECT, COLLECTION, {}, { pdsAgent: agent })

    expect(otherFetch).not.toHaveBeenCalled()
    expect(anonFetch).toHaveBeenCalledTimes(1)
  })

  it('refreshes an expired session and reads again', async () => {
    resolveDidDocData.mockResolvedValue(docWithPds(MOD_PDS))
    const sessionFetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { url, authorization } = seen(input, init)
        if (url.pathname === '/xrpc/com.atproto.server.refreshSession') {
          expect(authorization).toBe('Bearer refresh-1')
          return json({
            did: 'did:plc:moderator',
            handle: 'mod.example',
            accessJwt: 'access-2',
            refreshJwt: 'refresh-2',
            active: true,
          })
        }
        return authorization === 'Bearer access-2'
          ? json({ records: [{ uri: 'at://y', value: {} }] })
          : json({ error: 'ExpiredToken', message: 'Token has expired' }, 400)
      },
    )

    const data = await listRecords(
      SUBJECT,
      COLLECTION,
      {},
      { pdsAgent: signedIn(sessionFetch) },
    )

    expect(data).toEqual({ records: [{ uri: 'at://y', value: {} }] })
    expect(anonFetch).not.toHaveBeenCalled()
    // Every request the session made went to the moderator PDS.
    // (the expired read, the refresh, anything the client checks after it, the retry)
    expect(sessionFetch.mock.calls.length).toBeGreaterThanOrEqual(3)
    for (const [input, init] of sessionFetch.mock.calls) {
      expect(seen(input, init).url.origin).toBe(MOD_PDS)
    }
  })

  it('returns the error body when the session cannot be refreshed', async () => {
    resolveDidDocData.mockResolvedValue(docWithPds(MOD_PDS))
    const sessionFetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) =>
        seen(input, init).url.pathname ===
        '/xrpc/com.atproto.server.refreshSession'
          ? json({ error: 'ExpiredToken', message: 'Token has been revoked' }, 400)
          : json({ error: 'ExpiredToken', message: 'Token has expired' }, 400),
    )

    const data = await listRecords(
      SUBJECT,
      COLLECTION,
      {},
      { pdsAgent: signedIn(sessionFetch) },
    )

    // The Blocks tab shows this as an error. It is not an empty list.
    expect(data).toEqual({ error: 'ExpiredToken', message: 'Token has expired' })
    expect(anonFetch).not.toHaveBeenCalled()
  })

  it('throws when the account has no PDS in its DID document', async () => {
    resolveDidDocData.mockResolvedValue({ ...docWithPds(MOD_PDS), services: {} })

    await expect(listRecords(SUBJECT, COLLECTION, {})).rejects.toThrow(
      'Could not determine PDS service URL',
    )
    expect(anonFetch).not.toHaveBeenCalled()
  })
})
