import { useState, useMemo } from 'react'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { useLabelGroupsEditor, type LabelGroup } from './useLabelGroups'
import { unique, getReadableTextColor } from '@/lib/util'
import { ALL_LABELS, DEFAULT_LABEL_GROUP_COLOR } from '@/common/labels/util'
import { Card } from '@/common/Card'
import { ActionButton } from '@/common/buttons'
import { TrashIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/solid'
import { FormLabel, Input } from '@/common/forms'

interface GroupDropZoneProps {
  groupTitle: string
  group: LabelGroup
  draggedLabel: string | null
  onAddLabelToGroup: (groupTitle: string, label: string) => void
  onRemoveLabelFromGroup: (groupTitle: string, label: string) => void
  onRemoveGroup: (groupTitle: string) => void
  onUpdateGroup: (groupTitle: string, updates: { color?: string }) => void
  onDragStart: (e: React.DragEvent, label: string) => void
  onDragEnd: () => void
}

const GroupDropZone = ({
  groupTitle,
  group,
  draggedLabel,
  onAddLabelToGroup,
  onRemoveLabelFromGroup,
  onRemoveGroup,
  onUpdateGroup,
  onDragStart,
  onDragEnd,
}: GroupDropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [addLabelState, setAddLabelState] = useState({
    show: false,
    value: '',
  })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const label = e.dataTransfer.getData('text/plain')
    if (label && label !== '') {
      onAddLabelToGroup(groupTitle, label)
      onDragEnd()
    }
  }

  const handleAddLabel = () => {
    const trimmedLabel = addLabelState.value.trim()
    if (trimmedLabel && !group.labels.includes(trimmedLabel)) {
      onAddLabelToGroup(groupTitle, trimmedLabel)
      setAddLabelState({ show: false, value: '' })
    }
  }

  // Don't allow space in label values
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '')
    setAddLabelState((prev) => ({ ...prev, value }))
  }

  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddLabel()
    } else if (e.key === 'Escape') {
      setAddLabelState({ show: false, value: '' })
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`py-2 border-b transition-colors ${
        isDragOver
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-sm capitalize text-gray-900 dark:text-gray-100">
            {groupTitle}
          </h3>
          {group.note && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {group.note}
            </p>
          )}
        </div>
        <div className="flex flex-row gap-2">
          <ActionButton
            size="sm"
            appearance="outlined"
            onClick={() =>
              setAddLabelState((prev) => ({ ...prev, show: !prev.show }))
            }
            title="Add label manually"
          >
            <PlusIcon className="h-3 w-3" />
          </ActionButton>
          <input
            type="color"
            value={group.color || DEFAULT_LABEL_GROUP_COLOR}
            onChange={(e) =>
              onUpdateGroup(groupTitle, { color: e.target.value })
            }
            className="w-6 h-6 border-none cursor-pointer"
          />
          <ActionButton
            size="sm"
            appearance="outlined"
            onClick={() => onRemoveGroup(groupTitle)}
          >
            <TrashIcon className="h-3 w-3" />
          </ActionButton>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Labels ({group.labels.length})
          </p>
          {isDragOver && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              Drop here to add label
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {group.labels.map((label) => {
            const groupColor = group.color || DEFAULT_LABEL_GROUP_COLOR
            const textColor = getReadableTextColor(groupColor)
            return (
              <div
                key={label}
                draggable
                onDragStart={(e) => onDragStart(e, label)}
                onDragEnd={onDragEnd}
                className={`px-2 py-1 text-xs rounded flex items-center gap-2 cursor-move select-none transition-colors ${
                  draggedLabel === label
                    ? 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200'
                    : `${textColor} hover:opacity-80`
                }`}
                style={{
                  backgroundColor:
                    draggedLabel === label ? undefined : groupColor,
                }}
              >
                <span>{label}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onRemoveLabelFromGroup(groupTitle, label)
                  }}
                  className={`font-bold hover:opacity-80 ${textColor}`}
                >
                  ×
                </button>
              </div>
            )
          })}
          {group.labels.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Drag labels from above to add them to this group
            </p>
          )}
          {addLabelState.show && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={addLabelState.value}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyPress}
                placeholder="Enter label name (no spaces)"
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                autoFocus
              />
              <ActionButton
                size="sm"
                appearance="outlined"
                onClick={handleAddLabel}
                disabled={
                  !addLabelState.value.trim() ||
                  group.labels.includes(addLabelState.value.trim())
                }
              >
                <CheckIcon className="h-3 w-3" />
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const LabelGroupsConfig = () => {
  const { config } = useConfigurationContext()
  const {
    editorData,
    handleAddGroup,
    handleRemoveGroup,
    handleAddLabelToGroup,
    handleRemoveLabelFromGroup,
    handleUpdateGroup,
    handleSave,
    validateGroupTitle,
    mutation,
    canManageGroups,
  } = useLabelGroupsEditor()

  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupNote, setNewGroupNote] = useState('')
  const [newGroupColor, setNewGroupColor] = useState(DEFAULT_LABEL_GROUP_COLOR)
  const [draggedLabel, setDraggedLabel] = useState<string | null>(null)

  const allLabels = useMemo(
    () =>
      unique([
        ...(config?.labeler?.policies.labelValues || []),
        ...Object.values(ALL_LABELS).map(({ identifier }) => identifier),
      ]).sort((a, b) => a.localeCompare(b)),
    [config],
  )

  // gather ungrouped labels
  const ungroupedLabels = useMemo(() => {
    const groupedLabels = new Set<string>()
    Object.values(editorData).forEach((group) => {
      group.labels.forEach((label) => groupedLabels.add(label))
    })
    return allLabels.filter((label) => !groupedLabels.has(label))
  }, [allLabels, editorData])

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = newGroupTitle.trim()
    const error = validateGroupTitle(trimmedTitle)
    if (error) {
      return
    }

    const success = handleAddGroup(trimmedTitle, newGroupNote, newGroupColor)
    if (success) {
      setNewGroupTitle('')
      setNewGroupNote('')
      setNewGroupColor(DEFAULT_LABEL_GROUP_COLOR)
    }
  }

  const handleDragStart = (e: React.DragEvent, label: string) => {
    setDraggedLabel(label)
    e.dataTransfer.setData('text/plain', label)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedLabel(null)
  }

  if (!canManageGroups) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded">
        <p className="text-red-700 dark:text-red-300">
          You {"don't"} have permission to manage label groups.
        </p>
      </div>
    )
  }

  const trimmedGroupTitle = newGroupTitle.trim()
  const validatedGroupTitle = validateGroupTitle(trimmedGroupTitle)

  return (
    <div id="configure-label-groups">
      <div className="flex flex-row justify-between my-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Label Groups
        </h4>
      </div>
      <Card className="mb-4 pb-4">
        <div className="p-2">
          <p className="text-sm mb-2">
            Grouped labels help your moderators easily visualize and find labels
            when taking moderation actions.
            <br />
            Create new groups below and drag your labels into appropriate groups
            to give moderators a more organized list of labels.
          </p>
          <form
            onSubmit={handleCreateGroup}
            className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-row gap-4">
              <FormLabel
                htmlFor="title"
                label="Group Title"
                required
                className="mb-2 w-2/3"
              >
                <Input
                  required
                  type="text"
                  name="title"
                  value={newGroupTitle}
                  className="w-full"
                  onChange={(e) => setNewGroupTitle(e.target.value)}
                  placeholder="NSFW, Account Labels etc."
                />
                {trimmedGroupTitle && validatedGroupTitle && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {validatedGroupTitle}
                  </p>
                )}
              </FormLabel>

              <FormLabel htmlFor="color" label="Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    className="w-10 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {newGroupColor}
                  </span>
                </div>
              </FormLabel>
            </div>
            <FormLabel htmlFor="note" label="Note">
              <Input
                type="text"
                value={newGroupNote}
                placeholder="Optional note describing the group"
                onChange={(e) => setNewGroupNote(e.target.value)}
                className="w-full"
              />
            </FormLabel>
            <div className="flex flex-row justify-end mt-2">
              <ActionButton size="sm" type="submit" appearance="outlined">
                <span className="text-xs">Add Group</span>
              </ActionButton>
            </div>
          </form>

          {/* ungrouped Label list*/}
          <div className="my-2">
            <h5 className="text-sm text-gray-900 dark:text-gray-100">
              Ungrouped Labels ({ungroupedLabels.length})
            </h5>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Drag and drop labels from here into groups
            </p>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-b border-gray-200 pb-2 dark:border-gray-700">
            {ungroupedLabels.map((label) => (
              <div
                key={label}
                draggable
                onDragStart={(e) => handleDragStart(e, label)}
                onDragEnd={handleDragEnd}
                className={`text-xs px-2 py-1 rounded cursor-move select-none transition-colors ${
                  draggedLabel === label
                    ? 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                {label}
              </div>
            ))}
            {ungroupedLabels.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                All labels have been assigned to groups. You can also drag
                labels from one group to another to re-assign.
              </p>
            )}
          </div>

          <div>
            {Object.entries(editorData).map(([groupTitle, group]) => (
              <GroupDropZone
                key={groupTitle}
                groupTitle={groupTitle}
                group={group}
                draggedLabel={draggedLabel}
                onAddLabelToGroup={handleAddLabelToGroup}
                onRemoveLabelFromGroup={handleRemoveLabelFromGroup}
                onRemoveGroup={handleRemoveGroup}
                onUpdateGroup={handleUpdateGroup}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>

          {Object.keys(editorData).length === 0 && (
            <div className="text-center py-4 border-b border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                No groups created yet. Create your first group above.
              </p>
            </div>
          )}

          <div className="mt-3 mb-2 flex flex-row justify-end">
            <ActionButton
              appearance={mutation.isLoading ? 'outlined' : 'primary'}
              disabled={mutation.isLoading}
              onClick={handleSave}
              size="sm"
            >
              Save Groups
            </ActionButton>
          </div>
        </div>
      </Card>
    </div>
  )
}
