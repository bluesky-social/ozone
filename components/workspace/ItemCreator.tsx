import React from 'react'
import { Input } from '@/common/forms'
import { useWorkspaceAddItemsMutation } from './hooks'
import { ActionButton } from '@/common/buttons'
import { PlusIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { toast } from 'react-toastify'
import { getDidFromHandleInBatch } from '@/lib/identity'
import { pluralize } from '@/lib/util'
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
  // Opt out of the mutation's generic toast; we show one complete summary
  // (added + skipped) so the numbers reconcile with what the user entered.
  const addItemsMutation = useWorkspaceAddItemsMutation({ showToast: false })
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

      const enteredTokens = items
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

      const itemList = enteredTokens.filter(
        (item) => isDid(item) || isAtUri(item) || isPossiblyHandle(item),
      )

      // Tokens that aren't a DID, AT-URI, or plausible handle — silently
      // dropped before. Track them so we can tell the user.
      const invalidCount = enteredTokens.length - itemList.length

      const handleList = itemList.filter(isPossiblyHandle)

      // Handles that couldn't be resolved to a DID (mistyped, deleted, etc.).
      let unresolvedHandleCount = 0

      // If there are handles in the list, we need to resolve them to DIDs and replace the handles with dids before placing them in the workspace
      if (handleList.length > 0) {
        const handleToDid = await getDidFromHandleInBatch(handleList)
        Object.keys(handleToDid).forEach((handle) => {
          // If we couldn't find the did, we don't want to replace the handle in the list
          if (handleToDid[handle] === null) {
            unresolvedHandleCount++
            return
          }
          const handleIndex = itemList.indexOf(handle)
          if (handleIndex !== -1) {
            itemList[handleIndex] = handleToDid[handle]
          }
        })
      }

      // Detail the reasons anything was skipped, so the numbers reconcile with
      // what the user typed. (Unresolved handles are still added as raw handle
      // strings, so they're not counted as skipped here.)
      const entered = enteredTokens.length
      const skippedDetail: string[] = []
      if (invalidCount > 0) {
        skippedDetail.push(`${invalidCount} invalid`)
      }
      if (unresolvedHandleCount > 0) {
        skippedDetail.push(`${unresolvedHandleCount} handle(s) could not be resolved`)
      }
      const detailSuffix = skippedDetail.length
        ? ` (${skippedDetail.join(', ')})`
        : ''

      // Nothing valid to add — tell the user rather than silently doing nothing.
      if (itemList.length === 0) {
        toast.error(
          `No valid items to add${detailSuffix || '. Enter DIDs, AT-URIs, or handles.'}`,
        )
        setIsAdding(false)
        return false
      }

      await addItemsMutation.mutateAsync(itemList, {
        onSuccess: () => {
          // Single, self-consistent summary: added-vs-entered, with the reason
          // for any difference. The mutation's own generic toast is disabled
          // (showToast: false) so there's exactly one message.
          const addedCount = itemList.length
          const message =
            addedCount === entered
              ? `Added ${pluralize(addedCount, 'item')} to workspace.`
              : `Added ${addedCount} of ${pluralize(
                  entered,
                  'entered item',
                )} to workspace${detailSuffix}.`
          if (addedCount === entered) {
            toast.success(message)
          } else {
            toast.warning(message)
          }
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
