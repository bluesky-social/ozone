import { useQuery } from '@tanstack/react-query'
import { AppBskyFeedGetPostThread } from '@atproto/api'
import { parseAtUri } from '../../lib/util'
import client from '../../lib/client'
import { PostAsCard } from './posts/PostsFeed'
import Link from 'next/link'

export function RecordCard(props: { uri: string }) {
  const { uri } = props
  const parsed = parseAtUri(uri)
  if (!parsed) {
    return null
  }
  if (parsed.collection === 'app.bsky.feed.post') {
    return <PostCard uri={uri} />
  }
  return <GenericRecordCard uri={uri} />
}

function PostCard(props: { uri: string }) {
  const { uri } = props
  const { error, data } = useQuery({
    queryKey: ['postCard', { uri }],
    queryFn: async () => {
      // @TODO when unifying admin auth, ensure admin can see taken-down posts
      const { data: post } = await client.api.app.bsky.feed.getPostThread({
        uri,
        depth: 0,
      })
      return post
    },
  })
  if (error) {
    // Temp fallback for taken-down posts, re: TODO above
    return <GenericRecordCard uri={uri} />
  }
  if (!data || !AppBskyFeedGetPostThread.isThreadViewPost(data.thread)) {
    return null
  }
  return <PostAsCard dense controls={false} item={{ post: data.thread.post }} />
}

function GenericRecordCard(props: { uri: string }) {
  const { uri } = props
  const parsed = parseAtUri(uri)
  const { data: record } = useQuery({
    queryKey: ['recordCard', { uri }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getRecord(
        { uri },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })
  if (!record) return null
  return (
    <>
      {parsed && <RepoCard did={parsed.did} />}
      <pre className="text-xs overflow-auto max-h-36">
        {JSON.stringify(record, null, 2)}
      </pre>
    </>
  )
}

// Based on PostAsCard header
export function RepoCard(props: { did: string }) {
  const { did } = props
  const { data: profile } = useQuery({
    queryKey: ['repoCard', { did }],
    queryFn: async () => {
      // @TODO when unifying admin auth, ensure admin can see taken-down profiles
      const { data } = await client.api.app.bsky.actor.getProfile({
        actor: did,
      })
      return data
    },
  })
  if (!profile) return null
  return (
    <div className="bg-white">
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <img
            className="h-6 w-6 rounded-full"
            src={profile.avatar || '/img/default-avatar.jpg'}
            alt=""
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">
            <Link
              href={`/repositories/${profile.handle}`}
              className="hover:underline"
            >
              {profile.displayName ? (
                <>
                  <span className="font-bold">{profile.displayName}</span>
                  <span className="ml-1 text-gray-500">@{profile.handle}</span>
                </>
              ) : (
                <span className="font-bold">@{profile.handle}</span>
              )}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
