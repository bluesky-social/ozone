import { ActionButton, LinkButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LabelChip } from '@/common/labels'
import { ToolsOzoneSetDefs } from '@atproto/api'
import { PencilIcon } from '@heroicons/react/20/solid'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import Link from 'next/link'
import { createSetPageLink } from './utils'

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
              const editUrl = createSetPageLink({
                edit: set.name,
                description: set.description || '',
              })
              const viewUrl = createSetPageLink({ view: set.name })
              return (
                <div
                  key={set.name}
                  className={`flex flex-row justify-between px-2 ${
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
                        Updated{' '}
                        {dateFormatter.format(new Date(set.updatedAt))}
                      </span>
                    </div>
                  </div>
                  <div>
                    {canEdit && (
                      <LinkButton
                        size="xs"
                        appearance="outlined"
                        href={editUrl}
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs">Edit</span>
                      </LinkButton>
                    )}
                  </div>
                </div>
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
