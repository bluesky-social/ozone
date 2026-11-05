import { describe, expect, it, vi } from 'vitest'
import { Agent } from '@atproto/api'
import { fetchAtmosphereRecordView } from './atmosphereRecordView'

const cid = 'bafkreigs2iqxve4g42tt5hqkdjcwjxc3fkf5yty74kmx42yugozk4kx3ny'
const uri = 'at://did:plc:abcdefghijklmnopqrstuvwx/social.grain.gallery/3k'
const params = { uri, cid }

// The installed SDK has no generated method for this endpoint, so use a real
// Agent (XRPC serialization, proxy header, schema validation) and fake fetch.
function mockAgent(response: Response | (() => Response)) {
  const fetch = vi.fn(async () =>
    typeof response === 'function' ? response() : response,
  )
  const agent = new Agent({ service: 'https://pds.test', fetch }).withProxy(
    'atproto_labeler',
    'did:plc:ozone',
  )
  return { agent, fetch }
}

describe('fetchAtmosphereRecordView', () => {
  it('sends the selected uri and cid through the proxied agent and returns the full response', async () => {
    const body = {
      view: {
        $type: 'app.bsky.embed.external#viewGallery',
        uri: 'https://grain.social/gallery/3k',
        title: 'Gallery',
        description: '',
        items: [
          {
            $type: 'app.bsky.embed.external#viewGalleryImage',
            thumbnail: 'https://cdn.test/thumb.jpg',
            fullsize: 'https://cdn.test/full.jpg',
          },
        ],
      },
      associatedRefs: [{ uri, cid }],
      associatedRecords: [{ anything: 'goes' }],
    }
    const { agent, fetch } = mockAgent(Response.json(body))
    const signal = new AbortController().signal

    await expect(
      fetchAtmosphereRecordView(agent, params, signal),
    ).resolves.toEqual(body)

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    const request = new URL(url)
    expect(request.pathname).toBe(
      '/xrpc/app.bsky.unspecced.getAtmosphereRecordView',
    )
    expect(Object.fromEntries(request.searchParams)).toEqual(params)
    expect(init.signal).toBe(signal)
    expect(new Headers(init.headers).get('atproto-proxy')).toBe(
      'did:plc:ozone#atproto_labeler',
    )
  })

  it('can be called repeatedly, including from another agent', async () => {
    const first = mockAgent(() => Response.json({})).agent
    const second = mockAgent(() => Response.json({})).agent
    await fetchAtmosphereRecordView(first, params)
    await fetchAtmosphereRecordView(first, params)
    await expect(fetchAtmosphereRecordView(second, params)).resolves.toEqual({})
  })

  it.each([
    ['unavailable root', {}],
    [
      'associations without a view',
      { associatedRefs: [{ uri, cid }], associatedRecords: [{}] },
    ],
  ])('returns an %s as-is', async (_name, body) => {
    const { agent } = mockAgent(Response.json(body))
    await expect(fetchAtmosphereRecordView(agent, params)).resolves.toEqual(
      body,
    )
  })

  it('rejects on backend errors', async () => {
    const { agent } = mockAgent(
      Response.json(
        { error: 'InvalidRequest', message: 'bad uri' },
        { status: 400 },
      ),
    )
    await expect(fetchAtmosphereRecordView(agent, params)).rejects.toThrow(
      'bad uri',
    )
  })
})
