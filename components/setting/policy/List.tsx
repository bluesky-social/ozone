import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { TrashIcon } from '@heroicons/react/24/solid'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { usePolicyListEditor, usePolicyListSetting } from './usePolicyList'

export function PolicyList({
  canEdit = false,
  searchQuery,
}: {
  searchQuery: string | null
  canEdit: boolean
}) {
  const { data, isLoading } = usePolicyListSetting()
  const { onRemove, mutation, removingPolicy, setRemovingPolicy } =
    usePolicyListEditor()
  let policyList = Object.values(data?.value || {}).sort((prev, next) =>
    prev.name.localeCompare(next.name),
  )
  if (searchQuery) {
    policyList = policyList.filter((policy) =>
      policy.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }

  return (
    <>
      <Card className="mb-3 py-3">
        {isLoading ? (
          <p>Hang tight, we{"'"}re loading all policies...</p>
        ) : (
          <div>
            {!policyList?.length && (
              <p>
                {!searchQuery
                  ? 'No policies found.'
                  : `No policy matches the prefix "${searchQuery}". Please clear your search to see all policies`}
              </p>
            )}
            {policyList?.map((policy, i) => {
              const lastItem = i === policyList.length - 1
              return (
                <div
                  key={policy.name}
                  className={`flex flex-row justify-between px-2 ${
                    !lastItem
                      ? 'mb-2 border-b dark:border-gray-700 border-gray-100 pb-3'
                      : ''
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{policy.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {policy.description}
                    </p>
                    {policy.url && (
                      <p className="text-sm mt-1">
                        <span className="text-gray-500 dark:text-gray-500">
                          URL:{' '}
                        </span>
                        <a
                          href={policy.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {policy.url}
                        </a>
                      </p>
                    )}
                    {policy.severityLevels &&
                      policy.severityLevels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {policy.severityLevels.map((level) => (
                            <span
                              key={level}
                              className="inline-block bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs"
                            >
                              {level}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                  {canEdit && (
                    <div className="flex flex-row items-center gap-2 ml-4">
                      <ActionButton
                        size="xs"
                        appearance="outlined"
                        onClick={() => {
                          setRemovingPolicy(policy.name)
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
                onRemove(removingPolicy)
              }}
              isOpen={!!removingPolicy}
              setIsOpen={() => setRemovingPolicy('')}
              confirmButtonText="Yes, Remove Policy"
              confirmButtonDisabled={mutation.isLoading}
              error={mutation.error?.['message']}
              title={`Remove Policy?`}
              description={
                <>
                  You{"'"}re about to remove the filter policy{' '}
                  {`"${removingPolicy}"`}. You can always recreate your policy
                  from the event filter panel.
                </>
              }
            />
          </div>
        )}
      </Card>
    </>
  )
}
