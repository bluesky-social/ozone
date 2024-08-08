import React, { useState, useRef } from 'react'
import { Checkbox } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'
import { Card } from '@/common/Card'
import { groupSubjects } from './utils'
import { StatusBySubject } from '@/subject/useSubjectStatus'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { ReviewStateIcon } from '@/subject/ReviewStateMarker'
import { PreviewCard } from '@/common/PreviewCard'

interface WorkspaceListProps {
  list: string[]
  subjectStatuses: StatusBySubject
  onRemoveItem: (item: string) => void
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  list,
  subjectStatuses,
  onRemoveItem,
}) => {
  const groupedItems = groupSubjects(list)
  return (
    <div>
      <div className="space-y-2">
        {Object.entries(groupedItems).map(([key, items], parentIndex) => {
          if (!items.length) return null
          return (
            <ListGroup
              key={key}
              items={items}
              subjectStatuses={subjectStatuses}
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
  subjectStatuses,
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
        const subjectStatus = subjectStatuses[item]
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
            subjectStatus={subjectStatus}
            onRemoveItem={() => onRemoveItem(item)}
          />
        )
      })}
    </div>
  )
}

const ListItem = ({
  item,
  subjectStatus,
  onRemoveItem,
  onChange,
  onRef,
  isDetailShown,
  toggleDetail,
}: {
  isDetailShown: boolean
  toggleDetail: () => void
  item: string
  subjectStatus: StatusBySubject[string]
  onRemoveItem: () => void
  onChange: (event: React.MouseEvent<HTMLInputElement>) => void
  onRef: (instance: HTMLInputElement | null) => void
}) => {
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
          {subjectStatus ? (
            <>
              <SubjectOverview
                subject={subjectStatus.subject}
                subjectRepoHandle={subjectStatus.subjectRepoHandle}
              />
              <ReviewStateIcon subjectStatus={subjectStatus} className="ml-1" />
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
