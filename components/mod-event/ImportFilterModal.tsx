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

  return (
    <ConfirmationModal
      isOpen={isOpen}
      setIsOpen={setIsDialogOpen}
      title="Import Filters"
      onConfirm={handleConfirm}
      confirmButtonDisabled={isImporting}
      confirmButtonText="Import"
    >
      <Textarea
        disabled={isImporting}
        value={items}
        onChange={(e) => setItems(e.target.value)}
        placeholder={JSON.stringify({ types: ['appeal'] }, null, 1)}
        className="block p-2 w-full mt-4"
        rows={5}
      />
    </ConfirmationModal>
  )
}
