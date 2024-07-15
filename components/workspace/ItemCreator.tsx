import React from 'react'
import { Input } from '@/common/forms'
import { useWorkspaceAddItemsMutation } from './hooks'
import { ActionButton } from '@/common/buttons'
import { PlusIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { toast } from 'react-toastify'
import { buildItemsSummary, groupSubjects } from './utils'

interface WorkspaceItemCreatorProps {
  onCancel?: () => void
  size?: 'sm' | 'lg'
}

const WorkspaceItemCreator: React.FC<WorkspaceItemCreatorProps> = ({
  onCancel,
  size = 'lg',
}) => {
  const addItemsMutation = useWorkspaceAddItemsMutation()

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const formData = new FormData(event.currentTarget)
    const items = formData.get('items') as string
    const itemList = items
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.startsWith('did:') || item.startsWith('at://'))
    const groupedItems = groupSubjects(itemList)

    addItemsMutation.mutate(itemList, {
      onSuccess: () => {
        const addedItemsSummary = buildItemsSummary(groupedItems)
        toast.success(`Added ${addedItemsSummary} to the list.`)
        event.target.reset()
        onCancel?.()
      },
      onError: () => {
        toast.error('Failed to add items to the list.')
      },
    })
    return false
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center space-x-2 w-2/3 mx-auto"
    >
      <Input
        autoFocus
        name="items"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !!onCancel) {
            onCancel()
            e.stopPropagation()
          }
        }}
        placeholder="Enter DID/AT-URI items separated by commas"
        className={`block ${size === 'sm' ? 'p-1' : 'p-2'} w-full`}
      />
      <ActionButton type="submit" appearance="outlined" size={size}>
        <PlusIcon className={size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'} />
      </ActionButton>
      {!!onCancel && (
        <ActionButton
          type="button"
          appearance="outlined"
          size={size}
          onClick={onCancel}
        >
          <XMarkIcon className={size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'} />
        </ActionButton>
      )}
    </form>
  )
}

export default WorkspaceItemCreator
