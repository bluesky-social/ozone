import { ActionButton, LinkButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LabelChip } from '@/common/labels/List'
import { ToolsOzoneSetDefs } from '@atproto/api'
import { PencilIcon } from '@heroicons/react/20/solid'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import Link from 'next/link'
import { createSetPageLink } from './utils'
import { TrashIcon } from '@heroicons/react/24/solid'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { useState } from 'react'
import { useSetRemove } from './useSetList'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function SetList({
  sets,
  isInitialLoading,
  fetchNextPage,
  hasNextPage,
  onEdit,
  canEdit = false,
  searchQuery,
}: {
  searchQuery: string | null
  canEdit: boolean
  isInitialLoading: boolean
  sets: ToolsOzoneSetDefs.SetView[] | undefined
  fetchNextPage: () => void
  hasNextPage?: boolean
  onEdit: (set: ToolsOzoneSetDefs.Set) => void
}) {
  return (
    <>
      <Card className="mb-3 py-3">
        {isInitialLoading ? (
          <p>Hang tight, we{"'"}re loading all sets...</p>
        ) : (
          <div>
            {!sets?.length && (
              <p>
                {!searchQuery
                  ? 'No sets found.'
                  : `No set matches the prefix "${searchQuery}". Please clear your search to see all sets`}
              </p>
            )}
            {sets?.map((set, i) => {
              const lastItem = i === sets.length - 1
              return (
                <SetItem
                  key={set.name}
                  lastItem={lastItem}
                  set={set}
                  canEdit={canEdit}
                />
              )
            })}
          </div>
        )}
      </Card>

      {!!sets?.length && hasNextPage && (
        <div className="flex justify-center pb-2">
          <LoadMoreButton onClick={fetchNextPage} />
        </div>
      )}
    </>
  )
}

function SetItem({
  set,
  lastItem,
  canEdit,
}: {
  set: ToolsOzoneSetDefs.SetView
  lastItem: boolean
  canEdit: boolean
}) {
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false)
  const editUrl = createSetPageLink({
    edit: set.name,
    description: set.description || '',
  })
  const viewUrl = createSetPageLink({ view: set.name })
  const removeSet = useSetRemove(set.name)

  return (
    <div
      className={`flex flex-row justify-between items-start px-2 ${
        !lastItem
          ? 'mb-2 border-b dark:border-gray-700 border-gray-100 pb-3'
          : ''
      }`}
    >
      <div>
        <p>
          <Link href={viewUrl}>{set.name}</Link>
        </p>
        <p className="text-sm">{set.description}</p>
        <div className="-mx-1">
          <Link href={viewUrl}>
            <LabelChip>{set.setSize} values</LabelChip>
          </Link>

          <span className="text-xs">
            Updated {dateFormatter.format(new Date(set.updatedAt))}
          </span>
        </div>
      </div>
      {canEdit && (
        <ConfirmationModal
          onConfirm={() => {
            removeSet.mutateAsync().then(() => setShowRemoveConfirmation(false))
          }}
          isOpen={showRemoveConfirmation}
          setIsOpen={setShowRemoveConfirmation}
          confirmButtonText={'Remove Set'}
          confirmButtonDisabled={removeSet.isLoading}
          error={removeSet.error?.['message']}
          title={`Remove Set?`}
          description={
            <>
              You{"'"}re about to remove the set <b>{set.name}</b>. All values
              in the set will be removed along with the set.
            </>
          }
        />
      )}
      <div className="flex flex-row items-center gap-2">
        {canEdit && (
          <ActionButton
            appearance="outlined"
            size="sm"
            onClick={() => setShowRemoveConfirmation(true)}
          >
            <TrashIcon className="h-3 w-3 my-0.5" />
          </ActionButton>
        )}
        {canEdit && (
          <LinkButton size="xs" appearance="outlined" href={editUrl}>
            <PencilIcon className="h-3 w-3 mr-1" />
            <span className="text-xs">Edit</span>
          </LinkButton>
        )}
      </div>
    </div>
  )
}
