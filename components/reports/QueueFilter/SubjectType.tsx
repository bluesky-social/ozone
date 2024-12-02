import { ButtonGroup } from '@/common/buttons'
import {
  CollectionId,
  EmbedTypes,
  getCollectionName,
  getEmbedTypeName,
} from '../helpers/subject'
import { Checkbox } from '@/common/forms'
import { useQueueFilter } from '../useQueueFilter'

export const QueueFilterSubjectType = () => {
  const { queueFilters, toggleCollection, toggleSubjectType, toggleEmbedType } =
    useQueueFilter()
  const allEmbedTypes = Object.values(EmbedTypes)

  const selectedCollections = queueFilters.collections || []
  const selectedIncludeEmbedTypes: string[] =
    queueFilters.tags?.filter((tag) => {
      return tag.startsWith('embed:')
    }) || []
  const selectedExcludeEmbedTypes: string[] =
    queueFilters.excludeTags?.filter((tag) => {
      return tag.startsWith('embed:')
    }) || []

  return (
    <div>
      <h3 className="text-gray-900 dark:text-gray-200 mb-2">
        Subject Type Filters
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
            isActive: queueFilters.subjectType === 'account',
          },
          {
            id: 'subjectTypeRecord',
            text: 'Record',
            onClick: () => {
              toggleSubjectType('record')
            },
            isActive:
              queueFilters.subjectType === 'record' ||
              !!selectedCollections.length ||
              !!selectedIncludeEmbedTypes.length,
          },
        ]}
      />

      {queueFilters.subjectType === 'record' && (
        <div className="flex flex-row gap-4">
          <div>
            <h3 className="text-gray-900 dark:text-gray-200 my-2 border-b border-gray-400 pb-1">
              Record Collection
            </h3>

            {Object.values(CollectionId).map((collectionId) => {
              const isSelected = selectedCollections.includes(collectionId)
              return (
                <Checkbox
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
          <div>
            <h3 className="text-gray-900 dark:text-gray-200 my-2 border-b border-gray-400 pb-1">
              Record Embed
            </h3>
            {[...allEmbedTypes, 'noEmbed'].map((embedType) => {
              const isNoEmbed = embedType === 'noEmbed'
              const isSelected = isNoEmbed
                ? allEmbedTypes.every((et) =>
                    selectedExcludeEmbedTypes.includes(et),
                  )
                : selectedIncludeEmbedTypes.includes(embedType)
              return (
                <Checkbox
                  label={getEmbedTypeName(embedType)}
                  value={embedType}
                  key={embedType}
                  checked={isSelected}
                  onChange={() => {
                    toggleEmbedType(embedType)
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
