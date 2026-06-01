import { ChatBskyActorDefs, ChatBskyModerationDefs } from '@atproto/api'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { LoadingDense, LoadingFailedDense } from '@/common/Loader'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { RepoCard } from '@/common/RecordCard'
import { parseAtUri, pluralize } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { SubjectToWorkspaceAction } from '@/workspace/SubjectsToWorkspaceAction'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const useConvo = ({ convoId }: { convoId: string }) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    cacheTime: 10 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    retry: 0,
    enabled: !!convoId,
    queryKey: ['modConvoCard', { convoId }],
    queryFn: async () => {
      const { data } = await labelerAgent.api.chat.bsky.moderation.getConvo({
        convoId,
      })
      return data.convo
    },
  })
}

const useConvoMembers = ({
  convoId,
  enabled,
}: {
  convoId: string
  enabled: boolean
}) => {
  const labelerAgent = useLabelerAgent()
  return useInfiniteQuery({
    cacheTime: 10 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    retry: 0,
    enabled,
    queryKey: ['modConvoMembers', { convoId }],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const { data } =
        await labelerAgent.api.chat.bsky.moderation.getConvoMembers({
          convoId,
          cursor: pageParam,
          limit: 50,
        })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}

export function ConvoCard({ uri }: { uri: string }) {
  const parsed = parseAtUri(uri)
  const convoId = parsed?.rkey ?? ''
  const { data: convo, error, isLoading } = useConvo({ convoId })

  if (!convoId) return null
  if (isLoading) return <LoadingDense />
  if (error) {
    return (
      <LoadingFailedDense
        className="text-gray-600 mb-2"
        error={error}
        noPadding
      />
    )
  }
  if (!convo) return null

  return <ConvoCardView convoId={convoId} convo={convo} />
}

export function ConvoCardView({
  convoId,
  convo,
}: {
  convoId: string
  convo: ChatBskyModerationDefs.ConvoView
}) {
  const membersQuery = useConvoMembers({ convoId, enabled: !!convoId })
  const [showMembers, setShowMembers] = useState(false)

  const groupKind = ChatBskyModerationDefs.isGroupConvo(convo.kind)
    ? convo.kind
    : null
  const isGroup = !!groupKind
  const members =
    membersQuery.data?.pages.flatMap((p) => p.members) ?? []
  const owner = isGroup
    ? members.find(
        (m) =>
          ChatBskyActorDefs.isGroupConvoMember(m.kind) &&
          m.kind.role === 'owner',
      )
    : undefined

  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-sm">
      {groupKind ? (
        <GroupConvoHeader
          kind={groupKind}
          loadedMemberCount={members.length}
          showMembers={showMembers}
          onToggleMembers={() => setShowMembers((s) => !s)}
        />
      ) : (
        <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
          Direct conversation
        </p>
      )}

      {owner && (
        <div className="mt-2">
          <RepoCard did={owner.did} />
        </div>
      )}

      {(!isGroup || showMembers) && (
        <MembersPanel
          isGroup={isGroup}
          ownerDid={owner?.did}
          members={members}
          isLoading={membersQuery.isLoading}
          error={membersQuery.error}
          hasNextPage={!!membersQuery.hasNextPage}
          isFetchingNextPage={membersQuery.isFetchingNextPage}
          fetchNextPage={membersQuery.fetchNextPage}
        />
      )}
    </div>
  )
}

function GroupConvoHeader({
  kind,
  loadedMemberCount,
  showMembers,
  onToggleMembers,
}: {
  kind: ChatBskyModerationDefs.GroupConvo
  loadedMemberCount: number
  showMembers: boolean
  onToggleMembers: () => void
}) {
  const isLocked =
    kind.lockStatus === 'locked' || kind.lockStatus === 'locked-permanently'
  const LockIcon = isLocked ? LockClosedIcon : LockOpenIcon
  const lockLabel =
    kind.lockStatus === 'locked-permanently'
      ? 'Locked permanently'
      : kind.lockStatus === 'locked'
        ? 'Locked'
        : 'Unlocked'
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
        {kind.name || 'Group conversation'}
      </p>
      <span
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
          isLocked
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
            : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200'
        }`}
        title={`Lock status: ${kind.lockStatus}`}
      >
        <LockIcon className="h-3 w-3" />
        {lockLabel}
      </span>
      {kind.memberCount > 1 ? (
        <button
          type="button"
          onClick={onToggleMembers}
          className="text-xs text-gray-500 dark:text-gray-300 underline inline-flex items-center"
          title={
            loadedMemberCount > 0 && loadedMemberCount < kind.memberCount
              ? `${loadedMemberCount} loaded`
              : undefined
          }
        >
          {pluralize(kind.memberCount, 'member')} of {kind.memberLimit}
          {showMembers ? (
            <ChevronUpIcon className="h-3 w-3 ml-1 inline" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 ml-1 inline" />
          )}
        </button>
      ) : (
        <span className="text-xs text-gray-500 dark:text-gray-300">
          {pluralize(kind.memberCount, 'member')} of {kind.memberLimit}
        </span>
      )}
      {kind.joinRequestCount > 0 && (
        <span
          className="text-xs text-gray-500 dark:text-gray-300"
          title="Pending join requests visible to moderators (capped at 21)"
        >
          {pluralize(kind.joinRequestCount, 'pending join request')}
        </span>
      )}
      <span className="text-xs text-gray-400 dark:text-gray-400">
        Created {dateFormatter.format(new Date(kind.createdAt))}
      </span>
    </div>
  )
}

function MembersPanel({
  isGroup,
  ownerDid,
  members,
  isLoading,
  error,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  isGroup: boolean
  ownerDid?: string
  members: ChatBskyActorDefs.ProfileViewBasic[]
  isLoading: boolean
  error: unknown
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: ReturnType<typeof useConvoMembers>['fetchNextPage']
}) {
  const otherMembers = isGroup
    ? members.filter((m) => m.did !== ownerDid)
    : members

  const getSubjectsNextPage = async () => {
    const result = await fetchNextPage()
    if (result.data?.pages?.length) {
      const lastPage = result.data.pages[result.data.pages.length - 1]
      return {
        subjects: lastPage.members.map((m) => m.did),
        hasNextPage: !!result.hasNextPage,
      }
    }
    return { subjects: [], hasNextPage: false }
  }

  return (
    <div className="mt-2 rounded-sm bg-gray-50 dark:bg-slate-900/40 p-2">
      {isLoading && <LoadingDense />}
      {!!error && (
        <LoadingFailedDense
          className="text-gray-600"
          error={error}
          noPadding
        />
      )}
      {!isLoading && !error && members.length === 0 && (
        <p className="italic text-gray-500 dark:text-gray-300">
          No members found.
        </p>
      )}

      {isGroup && members.length > 0 && (
        <div className="flex flex-row justify-end mb-2">
          <SubjectToWorkspaceAction
            appearance="outlined"
            size="xs"
            initialSubjects={members.map((m) => m.did)}
            hasNextPage={hasNextPage}
            getSubjectsNextPage={getSubjectsNextPage}
            description={
              <>
                Once confirmed, all members of this conversation will be added
                to the workspace. For groups with many members this may take a
                while — you can stop the process at any time and members
                already added will remain in the workspace.
              </>
            }
          />
        </div>
      )}

      {otherMembers.length > 0 && (
        <div className="flex flex-col gap-1">
          {otherMembers.map((m) => (
            <MemberRow key={m.did} member={m} isGroup={isGroup} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-2">
          <LoadMoreButton
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          />
        </div>
      )}
    </div>
  )
}

function MemberRow({
  member,
  isGroup,
}: {
  member: ChatBskyActorDefs.ProfileViewBasic
  isGroup: boolean
}) {
  let label = ''
  if (isGroup) {
    if (ChatBskyActorDefs.isGroupConvoMember(member.kind)) {
      if (member.kind.role !== 'standard') label = member.kind.role
    } else if (ChatBskyActorDefs.isPastGroupConvoMember(member.kind)) {
      label = 'past member'
    }
  }
  return (
    <div>
      {label && (
        <p className="text-xs italic text-gray-400 dark:text-gray-400">
          {label}
        </p>
      )}
      <RepoCard did={member.did} />
    </div>
  )
}
