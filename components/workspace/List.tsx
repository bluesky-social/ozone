import React, { useState, useRef } from 'react'
import { Checkbox } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EnvelopeIcon,
  LockClosedIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'
import { Card } from '@/common/Card'
import { groupSubjects } from './utils'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { ReviewStateIcon } from '@/subject/ReviewStateMarker'
import { PreviewCard } from '@/common/PreviewCard'
import {
  WorkspaceListData,
  WorkspaceListItemData,
} from './useWorkspaceListData'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { ModerationLabel } from '@/common/labels'
import { SubjectTag } from 'components/tags/SubjectTag'

interface WorkspaceListProps {
  list: string[]
  listData: WorkspaceListData
  onRemoveItem: (item: string) => void
}

const getLangTagFromRecordValue = (
  record: ToolsOzoneModerationDefs.RecordViewDetail,
): string[] => {
  console.log(record)
  if (record?.moderation.subjectStatus?.tags?.length) return []
  const langTags = record.value?.['langs']?.map(
    (lang: string) => `lang:${lang}`,
  )
  return langTags || []
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  list,
  listData,
  onRemoveItem,
}) => {
  const groupedItems = groupSubjects(list)
  return (
    <div>
      <div className="space-y-2">
        {Object.entries(groupedItems).map(([key, items]) => {
          if (!items.length) return null
          return (
            <ListGroup
              key={key}
              items={items}
              listData={listData}
              onRemoveItem={onRemoveItem}
              title={`${key.charAt(0).toUpperCase()}${key.slice(1)}`}
            />
          )
        })}
      </div>
    </div>
  )
}

const ListGroup = ({
  items,
  title,
  listData,
  onRemoveItem,
}: {
  items: string[]
  title: string
} & Omit<WorkspaceListProps, 'list'>) => {
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null)
  const checkboxesRef = useRef<(HTMLInputElement | null)[]>([])
  const [detailShown, setDetailShown] = useState<string[]>([])
  const areAllDetailShown = items.every((item) => detailShown.includes(item))

  //   This ensures that when shift+clicking checkboxes, all checkboxes between the last interacted item are toggled
  const handleChange = (
    index: number,
    event: React.MouseEvent<HTMLInputElement>,
  ) => {
    const isChecked = event.currentTarget.checked
    if (event.nativeEvent['shiftKey'] && lastCheckedIndex !== null) {
      const start = Math.min(lastCheckedIndex, index)
      const end = Math.max(lastCheckedIndex, index)
      for (let i = start; i <= end; i++) {
        // Don't toggle the current item since it will automatically toggle
        if (checkboxesRef.current[i] && i !== index) {
          checkboxesRef.current[i]!.checked = !isChecked
        }
      }
    }
    setLastCheckedIndex(index)
  }

  return (
    <div className="pb-2">
      <div className="flex justify-between mb-1 mr-2">
        <h5 className="text-base font-semibold">
          {title}({items.length})
        </h5>
        <div>
          <ActionButton
            size="sm"
            appearance="outlined"
            onClick={() => {
              if (areAllDetailShown) {
                setDetailShown([])
              } else {
                setDetailShown(items)
              }
            }}
          >
            {areAllDetailShown ? (
              <ChevronUpIcon className="h-3 w-3" />
            ) : (
              <ChevronDownIcon className="h-3 w-3" />
            )}
          </ActionButton>
        </div>
      </div>
      {items.map((item, index) => {
        const itemData = listData[item]
        return (
          <ListItem
            key={item}
            item={item}
            isDetailShown={detailShown.includes(item)}
            toggleDetail={() =>
              setDetailShown((current) =>
                current.includes(item)
                  ? current.filter((i) => i !== item)
                  : [...current, item],
              )
            }
            onRef={(el) => (checkboxesRef.current[index] = el)}
            onChange={(event) => handleChange(index, event)}
            itemData={itemData}
            onRemoveItem={() => onRemoveItem(item)}
          />
        )
      })}
    </div>
  )
}

const ListItem = <ItemType extends string>({
  item,
  itemData,
  onRemoveItem,
  onChange,
  onRef,
  isDetailShown,
  toggleDetail,
}: {
  isDetailShown: boolean
  toggleDetail: () => void
  item: ItemType
  itemData: WorkspaceListItemData
  onRemoveItem: () => void
  onChange: (event: React.MouseEvent<HTMLInputElement>) => void
  onRef: (instance: HTMLInputElement | null) => void
}) => {
  const isRepo = ToolsOzoneModerationDefs.isRepoViewDetail(itemData)
  let repoHandle = itemData?.moderation.subjectStatus?.subjectRepoHandle
  let deactivatedAt = isRepo
    ? itemData?.deactivatedAt
    : itemData?.repo?.deactivatedAt

  // Derive language tag from record value if there isn't any tag in moderation.subjectStatus
  // which happens when a post has not been in the moderation system yet so we never tagged its language
  const langTagsFromRecord =
    !isRepo && itemData ? getLangTagFromRecordValue(itemData) : []

  if (!repoHandle && itemData) {
    if (isRepo) {
      repoHandle = itemData?.handle
    } else if (ToolsOzoneModerationDefs.isRecordViewDetail(itemData)) {
      repoHandle = itemData?.repo.handle
    }
  }

  return (
    <Card key={item}>
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center">
          <Checkbox
            id={item}
            name="workspaceItem"
            value={item}
            label=""
            ref={onRef}
            onMouseDown={onChange}
          />
          {itemData ? (
            <>
              <SubjectOverview
                subject={
                  item.startsWith('did:') ? { did: item } : { uri: item }
                }
                // Some links in the subject overview open the subject in quick action panel
                // however since this element is inside workspace panel, the link will have params
                // to open both quick action panel and workspace which would cause overlapping issues.
                // This ensures that we only open the quick action panel when the link is clicked.
                omitQueryParamsInLinks={['workspaceOpen']}
                subjectRepoHandle={repoHandle}
              />
              {itemData.moderation.subjectStatus && (
                <ReviewStateIcon
                  subjectStatus={itemData.moderation.subjectStatus}
                  className="ml-1"
                />
              )}
              {!!deactivatedAt && (
                <LockClosedIcon
                  className="w-4 h-4 ml-1 text-orange-700"
                  title={`User account was deactivated at ${deactivatedAt}`}
                />
              )}
              {/* emailConfirmedAt is only available on repoViewDetail */}
              {isRepo && !itemData.emailConfirmedAt && (
                <EnvelopeIcon
                  className="w-4 h-4 ml-1 text-red-600"
                  title={`User has not confirmed their email`}
                />
              )}
              {!!itemData.labels?.length && (
                <div className="flex ml-1">
                  {itemData.labels.map((label) => (
                    <ModerationLabel
                      key={`${label.src}_${label.val}`}
                      label={label}
                    />
                  ))}
                </div>
              )}
              {!!itemData.moderation.subjectStatus?.tags?.length && (
                <div className="flex ml-1">
                  {itemData.moderation.subjectStatus?.tags.map((tag) => (
                    <SubjectTag key={tag} tag={tag} />
                  ))}
                </div>
              )}
              {!!langTagsFromRecord.length && (
                <div className="flex ml-1">
                  {langTagsFromRecord.map((tag) => (
                    <SubjectTag key={tag} tag={tag} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <span className="flex-grow">{item}</span>
          )}
        </div>
        <div className="flex gap-2">
          <ActionButton size="sm" appearance="outlined" onClick={onRemoveItem}>
            <TrashIcon className="h-3 w-3" />
          </ActionButton>
          <ActionButton size="sm" appearance="outlined" onClick={toggleDetail}>
            {isDetailShown ? (
              <ChevronUpIcon className="h-3 w-3" />
            ) : (
              <ChevronDownIcon className="h-3 w-3" />
            )}
          </ActionButton>
        </div>
      </div>
      {isDetailShown && (
        <div className="pl-4 -mt-2">
          <PreviewCard subject={item} title=" " />
        </div>
      )}
    </Card>
  )
}

export default WorkspaceList
