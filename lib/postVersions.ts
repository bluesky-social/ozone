'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Agent,
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  ComAtprotoRepoStrongRef,
} from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { CollectionId } from '@/reports/helpers/subject'
import { parseAtUri } from './util'

/**
 * One version of a post, as returned by `app.bsky.feed.getPostVersions`.
 * Counts and viewer state cover only this version's CID. `editedAt` is when
 * this version was indexed, and is absent on the original. `indexedAt` is
 * always the original post's.
 */
export type PostVersion = AppBskyFeedDefs.PostView & { editedAt?: string }

const MOCK_POST_VERSIONS = process.env.NEXT_PUBLIC_MOCK_POST_VERSIONS === 'true'
const MOCK_FIXTURE_PATH = '/dev-fixtures/post-versions.json'

/**
 * Versions of a post, oldest first. Resolves to an empty array for posts that
 * were never edited, and for non-post records.
 */
export function usePostVersions(uri: string | undefined) {
  const labelerAgent = useLabelerAgent()
  const isPost = !!uri && parseAtUri(uri)?.collection === CollectionId.Post
  return useQuery({
    retry: false,
    enabled: isPost,
    queryKey: ['postVersions', { uri }],
    queryFn: async (): Promise<PostVersion[]> => {
      if (!uri) return []
      if (MOCK_POST_VERSIONS) {
        return getMockPostVersions(labelerAgent, uri)
      }
      /*
       * TODO: call labelerAgent.app.bsky.feed.getPostVersions({ uri }) once
       * the lexicon is published (APP-3946) and Ozone proxies it (APP-4017).
       */
      return []
    },
  })
}

/**
 * Number of reports per version CID, from the subject's report events.
 */
export function useReportedCids(uri: string | undefined, enabled = true) {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    retry: false,
    enabled: !!uri && enabled,
    queryKey: ['postVersionReports', { uri }],
    queryFn: async () => {
      const counts = new Map<string, number>()
      if (!uri) return counts
      const { data } = await labelerAgent.tools.ozone.moderation.queryEvents({
        subject: uri,
        types: ['tools.ozone.moderation.defs#modEventReport'],
        limit: 100,
      })
      for (const event of data.events) {
        if (!ComAtprotoRepoStrongRef.isMain(event.subject)) continue
        const cid = event.subject.cid
        counts.set(cid, (counts.get(cid) ?? 0) + 1)
      }
      return counts
    },
  })
}

export function isEditedPost(versions: PostVersion[] | undefined) {
  return !!versions && versions.length > 1
}

/**
 * "Original" for the first version, "Edit" or "Edit N" for the rest.
 */
export function getVersionLabel(versions: PostVersion[], index: number) {
  if (index === 0) return 'Original'
  return versions.length > 2 ? `Edit ${index}` : 'Edit'
}

/**
 * The version a moderator should see first: the most reported version that is
 * no longer current, or the current version if no older version was reported.
 */
export function getDefaultVersionCid(
  versions: PostVersion[],
  reportedCids: Map<string, number> | undefined,
) {
  const current = versions.at(-1)
  let best: PostVersion | undefined
  let bestCount = 0
  for (const version of versions) {
    const count = reportedCids?.get(version.cid) ?? 0
    if (version.cid !== current?.cid && count > bestCount) {
      best = version
      bestCount = count
    }
  }
  return (best ?? current)?.cid
}

type MockVersion = {
  cid: string
  record: Record<string, unknown>
  indexedAt: string
  editedAt?: string
  likeCount?: number
  repostCount?: number
  replyCount?: number
  quoteCount?: number
}

/**
 * Builds versions from `public/dev-fixtures/post-versions.json`, which the
 * dev-env seed script writes. The local data plane keeps no history, so the
 * earlier versions only exist in the fixture. Everything else comes from the
 * live post view.
 */
async function getMockPostVersions(
  agent: Agent,
  uri: string,
): Promise<PostVersion[]> {
  const res = await fetch(MOCK_FIXTURE_PATH)
  if (!res.ok) return []
  const fixture = (await res.json()) as Record<
    string,
    { versions: MockVersion[] } | undefined
  >
  const mock = fixture[uri]
  if (!mock) return []

  const { data } = await agent.app.bsky.feed.getPostThread({ uri, depth: 0 })
  if (!AppBskyFeedDefs.isThreadViewPost(data.thread)) return []
  const live = data.thread.post

  return mock.versions.map((version) => ({
    ...live,
    cid: version.cid,
    record: version.record,
    indexedAt: version.indexedAt,
    editedAt: version.editedAt,
    likeCount: version.likeCount,
    repostCount: version.repostCount,
    replyCount: version.replyCount,
    quoteCount: version.quoteCount,
    embed: withVersionAltText(live.embed, version.record),
  }))
}

/**
 * The live embed view carries the current alt text. Swap in the alt text from
 * this version's record so older versions show what they actually said.
 */
function withVersionAltText(
  embed: AppBskyFeedDefs.PostView['embed'],
  record: Record<string, unknown>,
): AppBskyFeedDefs.PostView['embed'] {
  const recordEmbed = record.embed as
    { images?: { alt?: string }[] } | undefined
  if (!AppBskyEmbedImages.isView(embed) || !recordEmbed?.images) return embed
  return {
    ...embed,
    images: embed.images.map((image, i) => ({
      ...image,
      alt: recordEmbed.images?.[i]?.alt ?? image.alt,
    })),
  }
}
