import React from 'react'
import { Input } from '@/common/forms'
import { useWorkspaceAddItemsMutation } from './hooks'
import { ActionButton } from '@/common/buttons'
import { PlusIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { toast } from 'react-toastify'
import { buildItemsSummary, groupSubjects } from './utils'
import { getDidFromHandleInBatch } from '@/lib/identity'
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

      const isDid = (item) => item.startsWith('did:')
      const isAtUri = (item) => item.startsWith('at://')
      // if it's not did or at-uri but contains .s it's possibly a handle
      const isPossiblyHandle = (item) =>
        item.includes('.') && !isDid(item) && !isAtUri(item)

      const itemList = items
        .split(',')
        .map((item) => item.trim())
        .filter(
          (item) => isDid(item) || isAtUri(item) || isPossiblyHandle(item),
        )

      const handleList = itemList.filter(isPossiblyHandle)

      // If there are handles in the list, we need to resolve them to DIDs and replace the handles with dids before placing them in the workspace
      if (handleList.length > 0) {
        const handleToDid = await getDidFromHandleInBatch(handleList)
        Object.keys(handleToDid).forEach((handle) => {
          // If we couldn't find the did, we don't want to replace the handle in the list
          if (handleToDid[handle] === null) {
            return
          }
          const handleIndex = itemList.indexOf(handle)
          if (handleIndex !== -1) {
            itemList[handleIndex] = handleToDid[handle]
          }
        })
      }

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
        placeholder="Enter DID/AT-URI items separated by commas"
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
