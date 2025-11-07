import { ActionButton, LinkButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import {
  PencilIcon,
  TrashIcon,
  StarIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/solid'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { usePolicyListEditor, usePolicyListSetting } from './usePolicyList'
import { createPolicyPageLink } from './utils'
import { TextWithLinks } from '@/common/TextWithLinks'

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
                  className={`px-2 ${
                    !lastItem
                      ? 'mb-2 border-b dark:border-gray-700 border-gray-100 pb-3'
                      : ''
                  }`}
                >
                  <div className="flex flex-row">
                    <div className="flex-1">
                      <p className="font-medium">
                        {policy.name}
                        {policy.url && (
                          <a
                            href={policy.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <ArrowTopRightOnSquareIcon className="ml-1 inline-block h-4 w-4 mb-1" />
                          </a>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {policy.description}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex flex-row items-start gap-2 ml-4">
                        <LinkButton
                          size="xs"
                          appearance="outlined"
                          href={createPolicyPageLink({ edit: policy.name })}
                        >
                          <PencilIcon className="h-3 w-3 mx-1" />
                        </LinkButton>
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
                  {policy.severityLevels &&
                    Object.keys(policy.severityLevels).length > 0 && (
                      <div className="mt-2">
                        {Object.entries(policy.severityLevels).map(
                          ([levelName, config]) => (
                            <div key={levelName} className='mt-1'>
                              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded text-xs">
                                {config.isDefault && (
                                  <StarIcon
                                    className="h-3 w-3 inline-block mr-1 text-purple-600 dark:text-purple-400"
                                    title="Default severity level"
                                  />
                                )}
                                <span className="font-medium">{levelName}</span>
                              </span>
                              {config.description && (
                                <TextWithLinks
                                  className="text-xs italic text-gray-500 dark:text-gray-400"
                                  text={config.description}
                                />
                              )}
                            </div>
                          ),
                        )}
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
