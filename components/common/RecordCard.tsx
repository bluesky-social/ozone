import { useQuery } from '@tanstack/react-query'
import {
  AppBskyFeedDefs,
  ToolsOzoneModerationDefs,
  AppBskyActorDefs,
  ComAtprotoLabelDefs,
  AppBskyActorProfile,
  asPredicate,
} from '@atproto/api'
import { buildBlueSkyAppUrl, parseAtUri, pluralize } from '@/lib/util'
import { PostAsCard } from './posts/PostsFeed'
import Link from 'next/link'
import { LoadingDense, displayError, LoadingFailedDense } from './Loader'
import { CollectionId } from '@/reports/helpers/subject'
import { ListRecordCard } from 'components/list/RecordCard'
import { FeedGeneratorRecordCard } from './feeds/RecordCard'
import { ProfileAvatar } from '@/repositories/ProfileAvatar'
import {
  FolderMinusIcon,
  FolderPlusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid'
import { StarterPackRecordCard } from './starterpacks/RecordCard'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  getProfileFromRepo,
  isValidRepoViewDetailed,
} from '@/repositories/helpers'
import {
  useWorkspaceAddItemsMutation,
  useWorkspaceList,
  useWorkspaceRemoveItemsMutation,
} from '@/workspace/hooks'

import type { JSX } from 'react'
import { VerificationBadge } from 'components/verification/Badge'

export function RecordCard(props: {
  uri: string
  showLabels?: boolean
  isAuthorDeactivated?: boolean
  isAuthorTakendown?: boolean
}) {
  const {
    uri,
    showLabels = false,
    isAuthorDeactivated,
    isAuthorTakendown,
  } = props
  const parsed = parseAtUri(uri)
  if (!parsed) {
    return null
  }
  if (parsed.collection === CollectionId.Post) {
    return (
      <PostCard
        uri={uri}
        showLabels={showLabels}
        isAuthorTakendown={isAuthorTakendown}
        isAuthorDeactivated={isAuthorDeactivated}
      />
    )
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

const isValidSelfLabels = asPredicate(ComAtprotoLabelDefs.validateSelfLabels)

function PostCard({
  uri,
  showLabels,
  isAuthorTakendown,
  isAuthorDeactivated,
}: {
  uri: string
  showLabels?: boolean
  isAuthorTakendown?: boolean
  isAuthorDeactivated?: boolean
}) {
  const labelerAgent = useLabelerAgent()

  const { error, data } = useQuery({
    retry: false,
    queryKey: ['postCard', { uri }],
    queryFn: async () => {
      const { data: post } = await labelerAgent.app.bsky.feed.getPostThread({
        uri,
        depth: 0,
      })
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
  if (AppBskyFeedDefs.isBlockedPost(data?.thread)) {
    return (
      <BaseRecordCard
        uri={uri}
        renderRecord={(record) => {
          const author = getProfileFromRepo(record.repo.relatedRecords)
          const selfLabels = isValidSelfLabels(record.value?.labels)
            ? record.value.labels.values
            : []
          const labels = selfLabels.map(({ val }) => ({
            val,
            uri: record.uri,
            src: record.repo.did,
            cts: new Date(0).toISOString(),
          }))
          return (
            <PostAsCard
              dense
              controls={[]}
              item={{
                post: {
                  author: {
                    did: record.repo.did,
                    handle: record.repo.handle,
                    ...author,
                    avatar: undefined,
                    labels: [],
                    $type: 'app.bsky.actor.defs#profileViewBasic',
                  },
                  labels,
                  uri: record.uri,
                  cid: record.cid,
                  record: record.value,
                  indexedAt: new Date(0).toISOString(),
                },
              }}
            />
          )
        }}
      />
    )
  }

  if (!data || !AppBskyFeedDefs.isThreadViewPost(data.thread)) {
    return null
  }
  return (
    <PostAsCard
      dense
      showLabels={showLabels}
      item={{ post: data.thread.post }}
      isAuthorTakendown={isAuthorTakendown}
      isAuthorDeactivated={isAuthorDeactivated}
      controls={['like', 'repost', 'workspace']}
    />
  )
}

function BaseRecordCard({
  uri,
  renderRecord,
}: {
  uri: string
  renderRecord: (
    record: ToolsOzoneModerationDefs.RecordViewDetail,
  ) => JSX.Element
}) {
  const labelerAgent = useLabelerAgent()

  const { data: record, error } = useQuery({
    retry: false,
    queryKey: ['recordCard', { uri }],
    queryFn: async () => {
      const { data } = await labelerAgent.api.tools.ozone.moderation.getRecord({
        uri,
      })
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
  const labelerAgent = useLabelerAgent()

  return useQuery({
    retry: false,
    queryKey: ['repoCard', { did }],
    queryFn: async () => {
      const getRepo = async () => {
        const { data: repo } =
          await labelerAgent.tools.ozone.moderation.getRepo({
            did,
          })
        return repo
      }
      const getProfile = async () => {
        try {
          const { data: profile } =
            await labelerAgent.app.bsky.actor.getProfile({
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
  profile?: AppBskyActorDefs.ProfileViewDetailed
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

  return <RepoCardView {...{ did, repo, profile }} />
}

export const RepoCardView = ({
  did,
  repo,
  profile,
}: {
  did: string
  repo?: ToolsOzoneModerationDefs.RepoViewDetail
  profile?: AppBskyActorDefs.ProfileViewDetailed
}) => {
  const { data: workspaceList } = useWorkspaceList()
  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()
  const { mutate: removeFromWorkspace } = useWorkspaceRemoveItemsMutation()
  const isInWorkspace = workspaceList?.includes(did)
  const isRepoView = isValidRepoViewDetailed(repo)
  const takendown = isRepoView && !!repo?.moderation.subjectStatus?.takendown

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
              href={`/repositories/${did}`}
              className="hover:underline text-gray-500 dark:text-gray-50"
            >
              {profile ? (
                <>
                  <span className="font-bold">{profile.displayName}</span>
                  <span
                    className="ml-1 text-gray-500 dark:text-gray-50"
                    title={`@${repo?.handle || did}`}
                  >
                    @{repo?.handle || did}
                  </span>
                  <VerificationBadge
                    className="ml-0.5"
                    size="sm"
                    profile={profile}
                  />
                </>
              ) : (
                <span className="font-bold">@{repo?.handle || did}</span>
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
            <p className="text-gray-500 dark:text-gray-50 break-words">
              {profile.description}
            </p>
          )}
          {!!profile && (
            <div className="flex flex-row items-center gap-2">
              <Link
                href={`/repositories/${did}?tab=followers`}
                className="flex gap-1 items-center rounded-md pt-2 pb-1 text-gray-500 dark:text-gray-50 underline hover:underline cursor-pointer"
              >
                <span className="text-sm">
                  {pluralize(profile?.followersCount || 0, 'follower')}
                </span>
              </Link>
              <Link
                href={`/repositories/${did}?tab=follows`}
                className="flex gap-1 items-center rounded-md pt-2 pb-1 text-gray-500 dark:text-gray-50 underline hover:underline cursor-pointer"
              >
                <span className="text-sm">
                  {pluralize(profile?.followsCount || 0, 'follow')}
                </span>
              </Link>
              <Link
                href={`/repositories/${did}?tab=posts`}
                className="flex gap-1 items-center rounded-md pt-2 pb-1 text-gray-500 dark:text-gray-50 underline hover:underline cursor-pointer"
              >
                <span className="text-sm">
                  {pluralize(profile?.postsCount || 0, 'post')}
                </span>
              </Link>
              {isInWorkspace ? (
                <button
                  type="button"
                  className="flex gap-1 items-center rounded-md pt-2 pb-1 text-gray-500 dark:text-gray-50 hover:underline cursor-pointer"
                  onClick={() => removeFromWorkspace([did])}
                >
                  <FolderMinusIcon className="w-4 h-4" />
                  <span className="text-sm">Remove from workspace</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="flex gap-1 items-center rounded-md pt-2 pb-1 text-gray-500 dark:text-gray-50 hover:underline cursor-pointer"
                  onClick={() => addToWorkspace([did])}
                >
                  <FolderPlusIcon className="w-4 h-4" />
                  <span className="text-sm">Add to workspace</span>
                </button>
              )}
            </div>
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
