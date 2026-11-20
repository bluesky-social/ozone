import { ActionButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { LoadingFailed } from '@/common/Loader'
import { PaginatedSelect } from '@/common/PaginatedSelect'
import { useQueueList } from '@/queues/useQueues'
import { useQueueMembers } from '@/assignments/useAssignments'
import { filterQueueMembers } from '@/assignments/queueMembers'
import { MemberList } from '@/team/MemberList'
import RolePicker from '@/team/RolePicker'
import { StatusPicker } from '@/team/StatusPicker'
import { useMemberList } from '@/team/useMemberList'
import { useEffect, useState } from 'react'
import { useDebounce } from 'react-use'

export function ModeratorDirectory({
  onSelect,
  queueId,
  onQueueChange,
}: {
  onSelect: (did: string) => void
  queueId?: number
  onQueueChange: (queueId?: number) => void
}) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  useDebounce(() => setQuery(search.trim()), 300, [search])
  const members = useMemberList(query, { enabled: queueId === undefined })
  const queues = useQueueList()
  const { hasNextPage, isFetching, fetchNextPage } = queues
  const queueOptions =
    queues.data?.pages.flatMap((page) =>
      page.queues.map((queue) => ({
        value: String(queue.id),
        label: queue.name,
      })),
    ) ?? []
  const selectedQueueLoaded = queueOptions.some(
    (queue) => queue.value === String(queueId),
  )
  useEffect(() => {
    if (
      queueId !== undefined &&
      !selectedQueueLoaded &&
      hasNextPage &&
      !isFetching
    ) {
      void fetchNextPage()
    }
  }, [queueId, selectedQueueLoaded, hasNextPage, isFetching, fetchNextPage])
  const assigned = useQueueMembers(queueId)
  const source = queueId === undefined ? members : assigned
  const visibleMembers =
    queueId === undefined
      ? members.data?.pages.flatMap((page) => page.members)
      : filterQueueMembers(assigned.data ?? [], {
          q: query,
          roles: members.roles,
          disabled: members.disabled,
        })

  return (
    <section aria-label="Moderator list" className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium text-gray-700 dark:text-gray-100">
          Select a moderator
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <PaginatedSelect
            ariaLabel="Moderator queue"
            className="mt-0 w-56"
            value={queueId?.toString() ?? ''}
            onChange={(value) =>
              onQueueChange(value ? Number(value) : undefined)
            }
            placeholder="All queues"
            options={
              queueId !== undefined && !selectedQueueLoaded
                ? [
                    ...queueOptions,
                    { value: String(queueId), label: `Queue ${queueId}` },
                  ]
                : queueOptions
            }
            hasNextPage={queues.hasNextPage}
            fetchNextPage={() => queues.fetchNextPage()}
          />
          <Input
            type="search"
            aria-label="Search moderators"
            placeholder="Search team members..."
            className="w-56 py-1"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <StatusPicker
            selected={members.disabled}
            onSelect={members.setDisabled}
          />
          <div className="w-48">
            <RolePicker
              size="sm"
              values={members.roles}
              onChange={members.setRoles}
            />
          </div>
        </div>
      </div>
      {queues.isError && (
        <div role="alert" className="mb-3">
          <p>Could not load queues.</p>
          <ActionButton
            appearance="outlined"
            size="sm"
            onClick={() => queues.refetch()}
          >
            Retry queues
          </ActionButton>
        </div>
      )}
      {queueId !== undefined && (
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Showing moderators currently assigned to this queue. Their statistics
          and activity history cover all queues.
        </p>
      )}
      {source.isError && (
        <div role="alert" className="mb-3">
          <LoadingFailed error={source.error} noPadding />
          <ActionButton
            appearance="outlined"
            size="sm"
            onClick={() => source.refetch()}
          >
            Retry
          </ActionButton>
        </div>
      )}
      {!source.isError && (
        <MemberList
          members={visibleMembers}
          isInitialLoading={source.isInitialLoading}
          fetchNextPage={() => members.fetchNextPage()}
          hasNextPage={queueId === undefined && members.hasNextPage}
          searchQuery={query}
          onSelect={(member) => onSelect(member.did)}
        />
      )}
    </section>
  )
}
