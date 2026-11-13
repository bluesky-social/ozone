import { Agent, AppBskyFeedDefs } from '@atproto/api'
import { describe, expect, it, vi } from 'vitest'
import { TypeFilterKey } from '../posts/constants'
import { getAuthorFeed } from './AuthorFeed'

const actor = 'did:plc:author'

const buildItem = (
  rkey: string,
  { repost = false }: { repost?: boolean } = {},
): AppBskyFeedDefs.FeedViewPost => ({
  post: {
    uri: `at://${actor}/app.bsky.feed.post/${rkey}`,
    cid: `bafy${rkey}`,
    author: { did: actor, handle: 'author.test' },
    indexedAt: '2026-01-01T00:00:00.000Z',
    record: {
      $type: 'app.bsky.feed.post',
      text: rkey,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  },
  ...(repost
    ? {
        reason: {
          $type: 'app.bsky.feed.defs#reasonRepost',
          by: { did: 'did:plc:reposter', handle: 'reposter.test' },
          indexedAt: '2026-01-01T00:00:00.000Z',
        },
      }
    : {}),
})

// Simulates app.bsky.feed.getAuthorFeed paginating over the given pages,
// where the cursor of each page points at the next one
const mockAgent = (
  pages: { feed: AppBskyFeedDefs.FeedViewPost[]; cursor?: string }[],
) => {
  const getAuthorFeedMock = vi.fn(async ({ cursor }: { cursor?: string }) => {
    const index = cursor ? Number(cursor.replace('page-', '')) : 0
    return { data: pages[index] }
  })
  const agent = {
    app: { bsky: { feed: { getAuthorFeed: getAuthorFeedMock } } },
  } as unknown as Agent

  return { agent, getAuthorFeedMock }
}

const fetchPage = (
  agent: Agent,
  typeFilter: TypeFilterKey,
  pageParam?: string,
) =>
  getAuthorFeed({
    query: '',
    labelerAgent: agent,
    appviewAgent: null,
    typeFilter,
    actor,
  })({ pageParam })

describe('getAuthorFeed', () => {
  it('stops paginating once a client-side filter reaches the end of the feed', async () => {
    const { agent, getAuthorFeedMock } = mockAgent([
      {
        feed: [buildItem('a'), buildItem('b', { repost: true })],
        cursor: 'page-1',
      },
      { feed: [buildItem('c', { repost: true }), buildItem('d')] },
    ])

    const page = await fetchPage(agent, 'reposts')

    expect(page.feed.map((item) => item.post.cid)).toEqual(['bafyb', 'bafyc'])
    // Without a cursor the next page is not requested again, which would
    // otherwise repeat the posts from the last page
    expect(page.cursor).toBeUndefined()
    expect(getAuthorFeedMock).toHaveBeenCalledTimes(2)
  })

  it('returns no cursor when the last page is requested with a cursor', async () => {
    const { agent } = mockAgent([
      { feed: [buildItem('a')], cursor: 'page-1' },
      { feed: [buildItem('b'), buildItem('c', { repost: true })] },
    ])

    const page = await fetchPage(agent, 'no_reposts', 'page-1')

    expect(page.feed.map((item) => item.post.cid)).toEqual(['bafyb'])
    expect(page.cursor).toBeUndefined()
  })

  it('returns the cursor of the next page when a client-side filter fills a page', async () => {
    const reposts = Array.from({ length: 30 }, (_, i) =>
      buildItem(`${i}`, { repost: true }),
    )
    const { agent, getAuthorFeedMock } = mockAgent([
      { feed: reposts.slice(0, 20), cursor: 'page-1' },
      { feed: reposts.slice(20), cursor: 'page-2' },
      { feed: [buildItem('last', { repost: true })] },
    ])

    const page = await fetchPage(agent, 'reposts')

    expect(page.feed).toHaveLength(30)
    expect(page.cursor).toBe('page-2')
    expect(getAuthorFeedMock).toHaveBeenCalledTimes(2)
  })

  it('returns the server response as is without a client-side filter', async () => {
    const { agent } = mockAgent([{ feed: [buildItem('a')] }])

    const page = await fetchPage(agent, 'no_filter')

    expect(page.feed.map((item) => item.post.cid)).toEqual(['bafya'])
    expect(page.cursor).toBeUndefined()
  })
})
