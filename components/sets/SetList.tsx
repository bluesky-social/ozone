import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LabelChip } from '@/common/labels'
import { useActionPanelLink } from '@/common/useActionPanelLink'
import { useSession } from '@/lib/useSession'
import { ToolsOzoneSetDefs } from '@atproto/api'
import { PencilIcon } from '@heroicons/react/20/solid'
import { LoadMoreButton } from '@/common/LoadMoreButton'

export function SetList({
  sets,
  isInitialLoading,
  fetchNextPage,
  hasNextPage,
  onEdit,
  canEdit = false,
}: {
  canEdit: boolean
  isInitialLoading: boolean
  sets: ToolsOzoneSetDefs.SetView[] | undefined
  fetchNextPage: () => void
  hasNextPage?: boolean
  onEdit: (set: ToolsOzoneSetDefs.Set) => void
}) {
  const createActionPanelLink = useActionPanelLink()
  const session = useSession()
  return (
    <>
      <Card className="mb-3 py-3">
        {isInitialLoading ? (
          <p>Hang tight, we{"'"}re loading all sets...</p>
        ) : (
          <div>
            {!sets?.length && <p>No sets found.</p>}
            {sets?.map((set, i) => {
              const lastItem = i === sets.length - 1
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
                    <p>{set.name}</p>
                    <p className="text-sm">{set.description}</p>
                    <div className="-mx-1">
                      <LabelChip className="text-red-600">
                        {set.setSize} items
                      </LabelChip>
                    </div>
                  </div>
                  <div>
                    {canEdit && (
                      <ActionButton
                        size="xs"
                        appearance="outlined"
                        onClick={() => onEdit(set)}
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs">Edit</span>
                      </ActionButton>
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
