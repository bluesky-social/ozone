import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { TrashIcon } from '@heroicons/react/24/solid'
import { ConfirmationModal } from '@/common/modals/confirmation'
import {
  useSeverityLevelEditor,
  useSeverityLevelSetting,
} from './useSeverityLevel'

export function SeverityLevelList({
  canEdit = false,
  searchQuery,
}: {
  searchQuery: string | null
  canEdit: boolean
}) {
  const { data, isLoading } = useSeverityLevelSetting()
  const { onRemove, mutation, removingSeverityLevel, setRemovingSeverityLevel } =
    useSeverityLevelEditor()
  let severityLevelList = Object.values(data?.value || {}).sort((prev, next) =>
    prev.name.localeCompare(next.name),
  )
  if (searchQuery) {
    severityLevelList = severityLevelList.filter((level) =>
      level.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }

  return (
    <>
      <Card className="mb-3 py-3">
        {isLoading ? (
          <p>Hang tight, we{"'"}re loading all severity levels...</p>
        ) : (
          <div>
            {!severityLevelList?.length && (
              <p>
                {!searchQuery
                  ? 'No severity levels found.'
                  : `No severity level matches the prefix "${searchQuery}". Please clear your search to see all severity levels`}
              </p>
            )}
            {severityLevelList?.map((level, i) => {
              const lastItem = i === severityLevelList.length - 1
              return (
                <div
                  key={level.name}
                  className={`flex flex-row justify-between px-2 ${
                    !lastItem
                      ? 'mb-2 border-b dark:border-gray-700 border-gray-100 pb-3'
                      : ''
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{level.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {level.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {level.strikeCount !== undefined && (
                        <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded">
                          Strike Count: {level.strikeCount}
                        </span>
                      )}
                      {level.strikeOnOccurrence !== undefined && (
                        <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                          Strike on Occurrence: {level.strikeOnOccurrence}
                        </span>
                      )}
                      {level.needsTakedown && (
                        <span className="inline-block bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded">
                          Needs Takedown
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-row items-center gap-2 ml-4">
                      <ActionButton
                        size="xs"
                        appearance="outlined"
                        onClick={() => {
                          setRemovingSeverityLevel(level.name)
                        }}
                      >
                        <TrashIcon className="h-3 w-3 mx-1" />
                      </ActionButton>
                    </div>
                  )}
                </div>
              )
            })}

            <ConfirmationModal
              onConfirm={() => {
                onRemove(removingSeverityLevel)
              }}
              isOpen={!!removingSeverityLevel}
              setIsOpen={() => setRemovingSeverityLevel('')}
              confirmButtonText="Yes, Remove Severity Level"
              confirmButtonDisabled={mutation.isLoading}
              error={mutation.error?.['message']}
              title={`Remove Severity Level?`}
              description={
                <>
                  You{"'"}re about to remove the severity level{' '}
                  {`"${removingSeverityLevel}"`}. You can always recreate it
                  later.
                </>
              }
            />
          </div>
        )}
      </Card>
    </>
  )
}
