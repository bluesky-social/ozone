import { useQuery } from '@tanstack/react-query'
import { AppBskyFeedDefs, ToolsOzoneModerationDefs } from '@atproto/api'
import { buildBlueSkyAppUrl, parseAtUri } from '@/lib/util'
import client from '@/lib/client'
import { PostAsCard } from './posts/PostsFeed'
import Link from 'next/link'
import { LoadingDense, displayError, LoadingFailedDense } from './Loader'
import { CollectionId } from '@/reports/helpers/subject'
import { ListRecordCard } from 'components/list/RecordCard'
import { FeedGeneratorRecordCard } from './feeds/RecordCard'
import { ProfileAvatar } from '@/repositories/ProfileAvatar'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs'
import { isSelfLabels } from '@atproto/api/dist/client/types/com/atproto/label/defs'
import { StarterPackRecordCard } from './srtarterpacks/RecordCard'

export function RecordCard(props: { uri: string; showLabels?: boolean }) {
  const { uri, showLabels = false } = props
  const parsed = parseAtUri(uri)
  if (!parsed) {
    return null
  }
  if (parsed.collection === CollectionId.Post) {
    return <PostCard uri={uri} showLabels={showLabels} />
  }
  if (parsed.collection === CollectionId.FeedGenerator) {
    return <FeedGeneratorRecordCard uri={uri} />
  }
  if (parsed.collection === CollectionId.FeedGenerator) {
    return <FeedGeneratorRecordCard uri={uri} />
  }
  if (parsed.collection === CollectionId.List) {
    return <ListRecordCard uri={uri} />
  }
  if (parsed.collection === CollectionId.StarterPack) {
    return <StarterPackRecordCard uri={uri} />
  }
  if (parsed?.collection === CollectionId.Profile) {
    return (
      <BaseRecordCard
        uri={uri}
        renderRecord={(record) => <RepoCard did={parsed.did} />}
      />
    )
  }
  return (
    <BaseRecordCard
      uri={uri}
      renderRecord={(record) => (
        <GenericRecordCard {...{ did: parsed?.did, record }} />
      )}
    />
  )
}

function PostCard(props: { uri: string; showLabels?: boolean }) {
  const { uri, showLabels } = props
  const { error, data } = useQuery({
    retry: false,
    queryKey: ['postCard', { uri }],
    queryFn: async () => {
      // @TODO when unifying admin auth, ensure admin can see taken-down posts
      const { data: post } = await client.api.app.bsky.feed.getPostThread(
        {
          uri,
          depth: 0,
        },
        { headers: client.proxyHeaders() },
      )
      return post
    },
  })
  if (error) {
    // Temp fallback for taken-down posts, re: TODO above
    return (
      <BaseRecordCard
        uri={uri}
        renderRecord={(record) => <GenericRecordCard {...{ record }} />}
      />
    )
  }

  // When the author of the post blocks the viewer, getPostThread won't return the necessary properties
  // to build the post view so we manually build the post view from the raw record data
  if (data?.thread?.blocked) {
    return (
      <BaseRecordCard
        uri={uri}
        renderRecord={(record) => (
          <PostAsCard
            dense
            controls={false}
            item={{
              post: {
                uri: record.uri,
                cid: record.cid,
                author: record.repo,
                record: record.value,
                labels: isSelfLabels(record.value['labels'])
                  ? record.value['labels'].values.map(({ val }) => ({
                      val,
                      uri: record.uri,
                      src: record.repo.did,
                      cts: new Date(0).toISOString(),
                    }))
                  : [],
                indexedAt: new Date(0).toISOString(),
              },
            }}
          />
        )}
      />
    )
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

function BaseRecordCard(props: {
  uri: string
  renderRecord: (
    record: ToolsOzoneModerationDefs.RecordViewDetail,
  ) => JSX.Element
}) {
  const { uri, renderRecord } = props
  const { data: record, error } = useQuery({
    retry: false,
    queryKey: ['recordCard', { uri }],
    queryFn: async () => {
      const { data } = await client.api.tools.ozone.moderation.getRecord(
        { uri },
        { headers: client.proxyHeaders() },
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

  return renderRecord(record)
}

function GenericRecordCard({
  record,
  did,
}: {
  record: ToolsOzoneModerationDefs.RecordViewDetail
  did?: string
}) {
  return (
    <>
      {did && <RepoCard did={did} />}
      <pre className="text-xs overflow-auto max-h-36">
        {JSON.stringify(record, null, 2)}
      </pre>
    </>
  )
}

const useRepoAndProfile = ({ did }: { did: string }) => {
  return useQuery({
    retry: false,
    queryKey: ['repoCard', { did }],
    queryFn: async () => {
      // @TODO when unifying admin auth, ensure admin can see taken-down profiles
      const getRepo = async () => {
        const { data: repo } = await client.api.tools.ozone.moderation.getRepo(
          { did },
          { headers: client.proxyHeaders() },
        )
        return repo
      }
      const getProfile = async () => {
        try {
          const { data: profile } = await client.api.app.bsky.actor.getProfile(
            {
              actor: did,
            },
            { headers: client.proxyHeaders() },
          )
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
}

export function InlineRepo(props: { did: string }) {
  const { did } = props
  const {
    data: { repo, profile } = {},
    error,
    isLoading,
  } = useRepoAndProfile({ did })

  // Since this is meant to be inline, we are not bothering with nice loading states for now
  // Feel free to add this in the future as needed.
  if (error) {
    return <span className="text-red-500">{displayError(error)}</span>
  }

  if (isLoading || !repo) return null

  return (
    <div className="flex">
      <div className="flex-shrink-0 mr-1">
        <ProfileAvatar
          {...{ profile, repo }}
          className="h-4 w-4 rounded-full"
        />
      </div>
      <Link href={`/repositories/${repo.did}`} className="hover:underline mr-1">
        {profile?.displayName ? (
          <>
            <span className="font-bold">{profile.displayName}</span>
            <span className="ml-1">@{repo.handle}</span>
          </>
        ) : (
          <span className="font-bold">@{repo.handle}</span>
        )}
      </Link>
    </div>
  )
}

const AssociatedProfileIcon = ({
  profile,
}: {
  profile?: ProfileViewDetailed
}) => {
  let title = ''

  if (profile?.associated?.labeler) {
    title = 'Labeler service'
  }
  if (profile?.associated?.feedgens) {
    title = 'Feed Generator'
  }
  if (profile?.associated?.lists) {
    title = 'List'
  }

  if (!title) return null
  return (
    <ShieldCheckIcon
      title={`This account is associated with ${title}. Please be cautious when moderating this account`}
      className="h-6 w-6 text-indigo-800 dark:text-teal-600"
    />
  )
}

// Based on PostAsCard header
export function RepoCard(props: { did: string }) {
  const { did } = props
  const { data: { repo, profile } = {}, error } = useRepoAndProfile({ did })
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
  const takendown = !!repo.moderation.subjectStatus?.takendown

  return (
    <div className="bg-white dark:bg-slate-800">
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <ProfileAvatar
            profile={profile}
            repo={repo}
            className="h-6 w-6 rounded-full"
          />

          <AssociatedProfileIcon profile={profile} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
            <Link
              href={`/repositories/${repo.did}`}
              className="hover:underline"
            >
              {profile?.displayName ? (
                <>
                  <span className="font-bold">{profile.displayName}</span>
                  <span className="ml-1 text-gray-500 dark:text-gray-50">
                    @{repo.handle}
                  </span>
                </>
              ) : (
                <span className="font-bold">@{repo.handle}</span>
              )}
            </Link>{' '}
            &nbsp;&middot;&nbsp;
            <a
              href={buildBlueSkyAppUrl({ did })}
              target="_blank"
              rel="noreferrer"
            >
              Peek
            </a>
          </p>
          {profile?.description && (
            <p className="text-gray-500 dark:text-gray-50">
              {profile.description}
            </p>
          )}
          {takendown && (
            <p className="pt-1 pb-1">
              <LoadingFailedDense
                className="inline-block font-normal text-gray-600 dark:text-gray-100"
                error="Account taken down"
                noPadding
              />
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
