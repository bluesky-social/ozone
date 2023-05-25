import { useQuery } from '@tanstack/react-query'
import { AppBskyFeedDefs, ComAtprotoAdminDefs } from '@atproto/api'
import { parseAtUri } from '../../lib/util'
import client from '../../lib/client'
import { PostAsCard } from './posts/PostsFeed'
import Link from 'next/link'
import { LoadingDense, LoadingFailed, LoadingFailedDense } from './Loader'

export function RecordCard(props: { uri: string; showLabels?: boolean }) {
  const { uri, showLabels = false } = props
  const parsed = parseAtUri(uri)
  if (!parsed) {
    return null
  }
  if (parsed.collection === 'app.bsky.feed.post') {
    return <PostCard uri={uri} showLabels={showLabels} />
  }
  return <GenericRecordCard uri={uri} />
}

function PostCard(props: { uri: string; showLabels?: boolean }) {
  const { uri, showLabels } = props
  const { error, data } = useQuery({
    retry: false,
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
  if (!data || !AppBskyFeedDefs.isThreadViewPost(data.thread)) {
    return null
  }
  return (
    <PostAsCard
      dense
      controls={false}
      item={{ post: data.thread.post }}
      showLabels={showLabels}
    />
  )
}

function GenericRecordCard(props: { uri: string }) {
  const { uri } = props
  const parsed = parseAtUri(uri)
  const { data: record, error } = useQuery({
    retry: false,
    queryKey: ['recordCard', { uri }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getRecord(
        { uri },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })
  if (error) {
    return (
      <LoadingFailedDense
        className="text-gray-600 mb-2"
        noPadding
        error={error}
      />
    )
  }
  if (!record) {
    return <LoadingDense />
  }
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
  const { data: { repo, profile } = {}, error } = useQuery({
    retry: false,
    queryKey: ['repoCard', { did }],
    queryFn: async () => {
      // @TODO when unifying admin auth, ensure admin can see taken-down profiles
      const getRepo = async () => {
        const { data: repo } = await client.api.com.atproto.admin.getRepo(
          { did },
          { headers: client.adminHeaders() },
        )
        return repo
      }
      const getProfile = async () => {
        try {
          const { data: profile } = await client.api.app.bsky.actor.getProfile({
            actor: did,
          })
          return profile
        } catch (err) {
          if (err?.['status'] === 400) {
            return undefined
          }
          throw err
        }
      }
      const [repo, profile] = await Promise.all([getRepo(), getProfile()])
      return { repo, profile }
    },
  })
  if (error) {
    return (
      <LoadingFailedDense
        className="text-gray-600 mb-2"
        noPadding
        error={error}
      />
    )
  }
  if (!repo) {
    return <LoadingDense />
  }
  const takendown =
    repo.moderation.currentAction?.action === ComAtprotoAdminDefs.TAKEDOWN
  return (
    <div className="bg-white">
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <img
            className="h-6 w-6 rounded-full"
            src={profile?.avatar || '/img/default-avatar.jpg'}
            alt=""
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">
            <Link
              href={`/repositories/${repo.handle}`}
              className="hover:underline"
            >
              {profile?.displayName ? (
                <>
                  <span className="font-bold">{profile.displayName}</span>
                  <span className="ml-1 text-gray-500">@{repo.handle}</span>
                </>
              ) : (
                <span className="font-bold">@{repo.handle}</span>
              )}
            </Link>{' '}
            &nbsp;&middot;&nbsp;
            <a
              href={`https://bsky.app/profile/${did}`}
              target="_blank"
              rel="noreferrer"
            >
              Peek
            </a>
            {takendown && (
              <LoadingFailedDense
                className="inline-block font-normal text-gray-600"
                noPadding
                error="Account taken down"
              />
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
