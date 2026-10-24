import React from 'react'
import { Input } from '@/common/forms'
import { useWorkspaceAddItemsMutation } from './hooks'
import { ActionButton } from '@/common/buttons'
import { PlusIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { toast } from 'react-toastify'
import { buildItemsSummary, groupSubjects } from './utils'
import { prepareWorkspaceItems } from './import'
import { ArrowPathIcon, PaperClipIcon } from '@heroicons/react/24/solid'

interface WorkspaceItemCreatorProps {
  onFileUploadClick: () => void
  onCancel?: () => void
  size?: 'sm' | 'lg'
}

const WorkspaceItemCreator: React.FC<WorkspaceItemCreatorProps> = ({
  onFileUploadClick,
  onCancel,
  size = 'lg',
}) => {
  const addItemsMutation = useWorkspaceAddItemsMutation()
  const [isAdding, setIsAdding] = React.useState(false)

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setIsAdding(true)

    try {
      const formData = new FormData(event.currentTarget)
      const items = formData.get('items') as string

      if (!items) {
        setIsAdding(false)
        return false
      }

      const itemList = await prepareWorkspaceItems(items.split(','))

      const groupedItems = groupSubjects(itemList)

      await addItemsMutation.mutateAsync(itemList, {
        onSuccess: () => {
          const addedItemsSummary = buildItemsSummary(groupedItems)
          toast.success(`Added ${addedItemsSummary} to workspace.`)
          event.target.reset()
          onCancel?.()
        },
        onError: () => {
          toast.error('Failed to add items to workspace.')
        },
      })

      setIsAdding(false)
      return false
    } catch (error) {
      setIsAdding(false)
      toast.error(
        `Failed to add items to workspace. ${(error as Error).message}`,
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center space-x-2 w-2/3 mx-auto"
    >
      <Input
        autoFocus
        disabled={isAdding}
        name="items"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !!onCancel) {
            onCancel()
            e.stopPropagation()
          }
        }}
        placeholder="Enter DIDs, AT-URIs, handles or profile/post URLs, separated by commas"
        className={`block ${size === 'sm' ? 'p-1' : 'p-2'} w-full`}
      />
      <ActionButton
        type="submit"
        appearance="outlined"
        size={size}
        disabled={isAdding}
      >
        {isAdding ? (
          <ArrowPathIcon className={size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'} />
        ) : (
          <PlusIcon className={size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'} />
        )}
      </ActionButton>
      <ActionButton
        type="button"
        appearance="outlined"
        size={size}
        onClick={onFileUploadClick}
        disabled={isAdding}
        title="Import from csv/json file with DIDs/AT-URIs"
      >
        {isAdding ? (
          <ArrowPathIcon className={size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'} />
        ) : (
          <PaperClipIcon className={size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'} />
        )}
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
