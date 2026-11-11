import { AppBskyFeedDefs } from '@atproto/api'
import { describe, expect, it } from 'vitest'
import { TypeFilterKey } from './constants'
import { isClientSideTypeFilter, matchesTypeFilter } from './typeFilter'

const author = {
  did: 'did:plc:author',
  handle: 'author.test',
}

const buildItem = ({
  reply = false,
  quote = false,
  repost = false,
}: {
  reply?: boolean
  quote?: boolean
  repost?: boolean
}): AppBskyFeedDefs.FeedViewPost => {
  const parent = {
    uri: 'at://did:plc:other/app.bsky.feed.post/parent',
    cid: 'bafyparent',
  }

  return {
    post: {
      uri: 'at://did:plc:author/app.bsky.feed.post/post',
      cid: 'bafypost',
      author,
      indexedAt: '2026-01-01T00:00:00.000Z',
      record: {
        $type: 'app.bsky.feed.post',
        text: 'hello',
        createdAt: '2026-01-01T00:00:00.000Z',
        ...(reply ? { reply: { root: parent, parent } } : {}),
      },
      ...(quote
        ? {
            embed: {
              $type: 'app.bsky.embed.record#view',
              record: {
                $type: 'app.bsky.embed.record#viewNotFound',
                uri: parent.uri,
                notFound: true,
              },
            },
          }
        : {}),
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
  }
}

const post = buildItem({})
const reply = buildItem({ reply: true })
const quote = buildItem({ quote: true })
const repost = buildItem({ repost: true })
const repostedReply = buildItem({ reply: true, repost: true })
const repostedQuote = buildItem({ quote: true, repost: true })
const quoteReply = buildItem({ reply: true, quote: true })

const items = {
  post,
  reply,
  quote,
  repost,
  repostedReply,
  repostedQuote,
  quoteReply,
}

const matching = (typeFilter: TypeFilterKey) =>
  Object.entries(items)
    .filter(([, item]) => matchesTypeFilter(item, typeFilter))
    .map(([name]) => name)

describe('matchesTypeFilter', () => {
  it('keeps only replies authored by the account for replies filter', () => {
    expect(matching('replies')).toEqual(['reply', 'quoteReply'])
  })

  it('keeps only reposts for reposts filter', () => {
    expect(matching('reposts')).toEqual([
      'repost',
      'repostedReply',
      'repostedQuote',
    ])
  })

  it('drops reposts for no_reposts filter', () => {
    expect(matching('no_reposts')).toEqual([
      'post',
      'reply',
      'quote',
      'quoteReply',
    ])
  })

  it('keeps only quotes that are not reposted for quotes filter', () => {
    expect(matching('quotes')).toEqual(['quote', 'quoteReply'])
  })

  it('keeps quotes and reposts for quotes_and_reposts filter', () => {
    expect(matching('quotes_and_reposts')).toEqual([
      'quote',
      'repost',
      'repostedReply',
      'repostedQuote',
      'quoteReply',
    ])
  })

  it('keeps everything for filters applied by the server', () => {
    const all = Object.keys(items)
    expect(matching('no_filter')).toEqual(all)
    expect(matching('posts_no_replies')).toEqual(all)
    expect(matching('posts_with_media')).toEqual(all)
  })
})

describe('isClientSideTypeFilter', () => {
  it.each<[TypeFilterKey, boolean]>([
    ['no_filter', false],
    ['posts_no_replies', false],
    ['posts_with_media', false],
    ['replies', true],
    ['reposts', true],
    ['no_reposts', true],
    ['quotes', true],
    ['quotes_and_reposts', true],
  ])('%s is applied on the client side: %s', (typeFilter, expected) => {
    expect(isClientSideTypeFilter(typeFilter)).toBe(expected)
  })
})
