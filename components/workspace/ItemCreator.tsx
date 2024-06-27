import React, { useState } from 'react'
import { Input } from '@/common/forms'
import { useWorkspaceAddItemsMutation } from './hooks'
import { ActionButton } from '@/common/buttons'
import { PlusIcon } from '@heroicons/react/20/solid'
import { toast } from 'react-toastify'
import { buildItemsSummary, groupSubjects } from './utils'

interface WorkspaceItemCreatorProps {}

const WorkspaceItemCreator: React.FC<WorkspaceItemCreatorProps> = () => {
  const addItemsMutation = useWorkspaceAddItemsMutation()

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    event.preventDefault()
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
      },
      onError: () => {
        toast.error('Failed to add items to the list.')
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center space-x-2 w-2/3 mx-auto"
    >
      <Input
        name="items"
        placeholder="Enter items separated by commas"
        className="block p-2 w-full"
      />
      <ActionButton type="submit" appearance="outlined">
        <PlusIcon className="h-5 w-5" />
      </ActionButton>
    </form>
  )
}

export default WorkspaceItemCreator
