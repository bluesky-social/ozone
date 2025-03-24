import React, { useState, useRef } from 'react'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EnvelopeIcon,
  LockClosedIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'

import { Checkbox } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { groupSubjects } from './utils'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { ReviewStateIcon } from '@/subject/ReviewStateMarker'
import { PreviewCard } from '@/common/PreviewCard'
import { WorkspaceListData } from './useWorkspaceListData'
import { SubjectTag } from 'components/tags/SubjectTag'
import { ModerationLabel } from '@/common/labels'
import { WorkspaceExportPanel } from './ExportPanel'
import { HIGH_PROFILE_FOLLOWER_THRESHOLD } from '@/lib/constants'

interface WorkspaceListProps {
  list: string[]
  canExport: boolean
  listData: WorkspaceListData
  onRemoveItem: (item: string) => void
}

const GroupTitles = {
  dids: 'Accounts',
}

const isString = (value: unknown): value is string => typeof value === 'string'
const ifStringArray = (value: unknown): undefined | string[] =>
  Array.isArray(value) && value.every(isString) ? value : undefined

const getLangTagFromRecordValue = (
  record: ToolsOzoneModerationDefs.RecordViewDetail,
): string[] => {
  if (record?.moderation.subjectStatus?.tags?.length) return []
  const langs = ifStringArray(record.value?.['langs'])
  return langs?.map((lang: string) => `lang:${lang}`) ?? []
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  list,
  listData,
  canExport,
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
              canExport={canExport}
              title={
                GroupTitles[key] ||
                `${key.charAt(0).toUpperCase()}${key.slice(1)}`
              }
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
  canExport,
}: {
  items: string[]
  title: string
  canExport?: boolean
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
    <div className="py-2">
      <div className="flex justify-between mb-1 mr-2">
        <h5 className="text-base font-semibold">
          {title}({items.length})
        </h5>
        <div className="flex gap-1">
          {canExport && <WorkspaceExportPanel listData={listData} />}
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
  itemData?: ToolsOzoneModerationDefs.SubjectView
  onRemoveItem: () => void
  onChange: (event: React.MouseEvent<HTMLInputElement>) => void
  onRef: (instance: HTMLInputElement | null) => void
}) => {
  // Derive language tag from record value if there isn't any tag in moderation.subjectStatus
  // which happens when a post has not been in the moderation system yet so we never tagged its language
  const langTagsFromRecord = itemData?.record
    ? getLangTagFromRecordValue(itemData.record)
    : []

  const isSubjectRecord = item.startsWith('at://')
  const displayTags = isSubjectRecord
    ? itemData?.record?.moderation.subjectStatus?.tags
    : itemData?.repo?.moderation.subjectStatus?.tags
  const displayLabels = isSubjectRecord
    ? itemData?.record?.labels
    : itemData?.repo?.labels

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
                subjectRepoHandle={itemData.repo?.handle}
              />
              {itemData.profile?.followersCount &&
                itemData.profile.followersCount >
                  HIGH_PROFILE_FOLLOWER_THRESHOLD && (
                  <StarIcon
                    className="w-4 h-4 ml-1 text-orange-300"
                    title={`High profile user with ${itemData.profile.followersCount} followers`}
                  />
                )}
              {itemData.status && (
                <ReviewStateIcon
                  subjectStatus={itemData.status}
                  className="ml-1"
                  size="sm"
                />
              )}
              {!!itemData.repo?.deactivatedAt && (
                <LockClosedIcon
                  className="w-4 h-4 ml-1 text-orange-700"
                  title={`User account was deactivated at ${itemData.repo.deactivatedAt}`}
                />
              )}
              {!itemData.repo?.emailConfirmedAt && (
                <EnvelopeIcon
                  className="w-4 h-4 ml-1 text-red-600"
                  title={`User has not confirmed their email`}
                />
              )}
              {((isSubjectRecord && !itemData.record) ||
                (!isSubjectRecord && !itemData.repo)) && (
                <TrashIcon
                  className="w-4 h-4 ml-1 text-red-600"
                  title={
                    item.startsWith('did:')
                      ? 'Account not found on the network'
                      : 'Record not found on the network'
                  }
                  aria-label={
                    item.startsWith('did:')
                      ? 'Account not found on the network'
                      : 'Record not found on the network'
                  }
                />
              )}
              {!!displayLabels?.length && (
                <div className="flex ml-1">
                  {displayLabels.map((label) => (
                    <ModerationLabel
                      key={`${label.src}_${label.val}`}
                      label={label}
                    />
                  ))}
                </div>
              )}
              {!!langTagsFromRecord?.length && (
                <div className="flex ml-1">
                  {langTagsFromRecord.map((tag) => (
                    <SubjectTag key={tag} tag={tag} />
                  ))}
                </div>
              )}
              {!!displayTags?.length && (
                <div className="flex ml-1">
                  {displayTags.map((tag) => (
                    <SubjectTag key={tag} tag={tag} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <SubjectOverview
              subject={item.startsWith('did:') ? { did: item } : { uri: item }}
              omitQueryParamsInLinks={['workspaceOpen']}
            />
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
