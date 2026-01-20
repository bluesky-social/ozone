import { useState } from 'react'
import { toast } from 'react-toastify'

import { Textarea } from '@/common/forms'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { EventListState } from './useModEventList'

export const ImportFilterModal = ({
  isOpen,
  setIsDialogOpen,
  onSubmit,
}: {
  isOpen: boolean
  setIsDialogOpen: (isOpen: boolean) => void
  onSubmit?: (filters: Partial<EventListState>) => void
}) => {
  const [isImporting, setIsImporting] = useState(false)
  const [items, setItems] = useState('')

  const handleConfirm = async () => {
    try {
      setIsImporting(true)
      const filters = JSON.parse(items) as Partial<EventListState>
      onSubmit?.(filters)
      toast.success('Filters imported.')
      setIsDialogOpen(false)
      setItems('')
    } catch (err) {
      console.error('Error importing filter:', err)
      toast.error(
        'Failed to import filter. Please check the format and try again.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  const explainer = `How to use:
1. Click the 'Copy Filters' button in this page.
2. Paste the results here. An example is below.`
  const example = JSON.stringify(
    {
      types: [
        'appeal',
        'tools.ozone.moderation.defs#modEventDivert',
        'enableDms',
      ],
      reportTypes: [],
      addedLabels: [],
      removedLabels: [],
      commentFilter: {
        enabled: false,
        keyword: '',
      },
      oldestFirst: false,
      withStrike: false,
    },
    null,
    4,
  )

  return (
    <ConfirmationModal
      isOpen={isOpen}
      setIsOpen={setIsDialogOpen}
      title="Import Filters"
      onConfirm={handleConfirm}
      confirmButtonDisabled={isImporting}
      confirmButtonText="Import"
    >
      <p className="mt-4 text-md font-light whitespace-pre text-gray-900 dark:text-gray-50">
        {explainer}
      </p>
      <Textarea
        disabled={isImporting}
        value={items}
        onChange={(e) => setItems(e.target.value)}
        placeholder={example}
        className="block p-2 w-full mt-2"
        rows={20}
      />
    </ConfirmationModal>
  )
}
