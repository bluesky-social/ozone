import { XCircleIcon } from '@heroicons/react/24/solid'
import { ButtonGroup } from '@/common/buttons'
import { CollectionId, getCollectionName } from '../helpers/subject'
import { Checkbox } from '@/common/forms'
import { useQueueFilter } from '../useQueueFilter'

export const QueueFilterSubjectType = () => {
  const {
    queueFilters,
    toggleCollection,
    toggleSubjectType,
    clearSubjectType,
  } = useQueueFilter()

  const selectedCollections = queueFilters.collections || []
  const hasSubjectTypeFilter =
    !!queueFilters.subjectType || !!selectedCollections.length
  const selectedIncludeEmbedTypes: string[] =
    queueFilters.tags?.filter((tag) => {
      return tag.startsWith('embed:')
    }) || []

  return (
    <SubjectTypeFilter
      hasSubjectTypeFilter={hasSubjectTypeFilter}
      isSubjectTypeAccount={queueFilters.subjectType === 'account'}
      selectedCollections={selectedCollections}
      isSubjectTypeRecord={
        queueFilters.subjectType === 'record' ||
        !!selectedCollections.length ||
        !!selectedIncludeEmbedTypes.length
      }
      toggleCollection={toggleCollection}
      toggleSubjectType={toggleSubjectType}
      clearSubjectType={clearSubjectType}
    />
  )
}

export const SubjectTypeFilter = ({
  hasSubjectTypeFilter,
  isSubjectTypeRecord,
  isSubjectTypeAccount,
  selectedCollections,
  toggleSubjectType,
  clearSubjectType,
  toggleCollection,
}: {
  hasSubjectTypeFilter: boolean
  isSubjectTypeRecord: boolean
  isSubjectTypeAccount: boolean
  selectedCollections: string[]
  toggleSubjectType: (subjectType: 'account' | 'record') => void
  clearSubjectType: () => void
  toggleCollection: (collectionId: string) => void
}) => {
  return (
    <div>
      <h3 className="text-gray-900 dark:text-gray-200 mb-2">
        <button
          type="button"
          className="flex flex-row items-center"
          onClick={() => {
            if (hasSubjectTypeFilter) {
              clearSubjectType()
            }
          }}
        >
          Subject Type Filters
          {hasSubjectTypeFilter && <XCircleIcon className="h-4 w-4 ml-1" />}
        </button>
      </h3>

      <ButtonGroup
        appearance="primary"
        leftAligned
        size="xs"
        items={[
          {
            id: 'subjectTypeAccount',
            text: 'Account',
            onClick: () => {
              toggleSubjectType('account')
            },
            isActive: isSubjectTypeAccount,
          },
          {
            id: 'subjectTypeRecord',
            text: 'Record',
            onClick: () => {
              toggleSubjectType('record')
            },
            isActive: isSubjectTypeRecord,
          },
        ]}
      />

      {isSubjectTypeRecord && (
        <div className="flex flex-row gap-4">
          <div>
            <h3 className="text-gray-900 dark:text-gray-200 my-2 border-b border-gray-400 pb-1">
              Record Collection
            </h3>

            <div className="flex flex-row gap-x-3 gap-y-1 flex-wrap">
              {Object.values(CollectionId).map((collectionId) => {
                const isSelected = selectedCollections.includes(collectionId)
                return (
                  <Checkbox
                    className="flex items-center"
                    label={getCollectionName(collectionId)}
                    value={collectionId}
                    key={collectionId}
                    checked={isSelected}
                    onChange={() => {
                      toggleCollection(collectionId)
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
