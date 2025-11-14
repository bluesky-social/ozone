import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { TrashIcon } from '@heroicons/react/24/solid'
import { ConfirmationModal } from '@/common/modals/confirmation'
import {
  useSeverityLevelEditor,
  useSeverityLevelSetting,
} from './useSeverityLevel'
import { pluralize } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export function SeverityLevelList({
  canEdit = false,
  searchQuery,
}: {
  searchQuery: string | null
  canEdit: boolean
}) {
  const labelerAgent = useLabelerAgent()
  const { data, isLoading } = useSeverityLevelSetting(labelerAgent)
  const {
    onRemove,
    mutation,
    removingSeverityLevel,
    setRemovingSeverityLevel,
  } = useSeverityLevelEditor()
  let severityLevelList = Object.entries(data?.value || {}).sort(
    ([prev], [next]) => prev.localeCompare(next),
  )
  if (searchQuery) {
    severityLevelList = severityLevelList.filter(([name, level]) => {
      const q = searchQuery.toLowerCase()
      return (
        level.description?.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
      )
    })
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
            {severityLevelList?.map(([name, level], i) => {
              const lastItem = i === severityLevelList.length - 1
              return (
                <div
                  key={name}
                  className={`flex flex-row justify-between px-2 ${
                    !lastItem
                      ? 'mb-2 border-b dark:border-gray-700 border-gray-100 pb-3'
                      : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex flex-row items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium">{name}</p>
                      {level.strikeCount !== undefined && (
                        <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded text-xs">
                          {pluralize(level.strikeCount, 'strike')}
                        </span>
                      )}
                      {level.firstOccurrenceStrikeCount !== undefined && (
                        <span className="inline-block bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded text-xs">
                          {pluralize(
                            level.firstOccurrenceStrikeCount,
                            'strike',
                          )}{' '}
                          on 1st
                        </span>
                      )}
                      {level.strikeOnOccurrence !== undefined && (
                        <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded text-xs">
                          on {level.strikeOnOccurrence}
                          {level.strikeOnOccurrence === 1
                            ? 'st'
                            : level.strikeOnOccurrence === 2
                            ? 'nd'
                            : level.strikeOnOccurrence === 3
                            ? 'rd'
                            : 'th'}{' '}
                          occurrence
                        </span>
                      )}
                      {level.expiryInDays !== undefined && (
                        <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-xs">
                          expires {level.expiryInDays}d
                        </span>
                      )}
                      {level.needsTakedown && (
                        <span className="inline-block bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded text-xs">
                          immediate ban
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {level.description}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex flex-row items-start gap-2 ml-4">
                      <ActionButton
                        size="xs"
                        appearance="outlined"
                        onClick={() => {
                          setRemovingSeverityLevel(name)
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
