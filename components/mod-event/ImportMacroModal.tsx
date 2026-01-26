import { useState } from 'react'
import { toast } from 'react-toastify'

import { Input, Textarea } from '@/common/forms'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { useFilterMacroUpsertMutation } from '@/mod-event/useFilterMacrosList'
import { EventListState } from './useModEventList'

export const ImportMacroModal = ({
  isOpen,
  setIsDialogOpen,
}: {
  isOpen: boolean
  setIsDialogOpen: (isOpen: boolean) => void
}) => {
  const { mutateAsync: upsertMacro } = useFilterMacroUpsertMutation()

  const [isImporting, setIsImporting] = useState(false)
  const [name, setName] = useState('')
  const [items, setItems] = useState('')

  const handleConfirm = async () => {
    try {
      setIsImporting(true)
      const filters = JSON.parse(items) as Partial<EventListState>
      await upsertMacro({ name, filters })
      setIsDialogOpen(false)
      setName('')
      setItems('')
    } catch (err) {
      console.error('Error importing macro:', err)
      toast.error(
        'Failed to import macro. Please check the format and try again.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  const explainer = `This is for sharing macros between team members.

1. The sharer should click the copy button next to the macro and share the output with you.
2. Fill in the macro name, paste the results in the text box, then click 'Import'.`
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
      title="Import Macro"
      onConfirm={handleConfirm}
      confirmButtonDisabled={isImporting}
      confirmButtonText="Import"
    >
      <div className="flex flex-col gap-2 mt-4">
        <p className="mt-4 text-md font-light whitespace-pre-wrap text-gray-900 dark:text-gray-50">
          {explainer}
        </p>
        <Input
          autoFocus
          disabled={isImporting}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="mt-4 block p-2 w-full"
          type="text"
        />
        <Textarea
          disabled={isImporting}
          value={items}
          onChange={(e) => setItems(e.target.value)}
          placeholder={example}
          className="block p-2 w-full"
          rows={20}
        />
      </div>
    </ConfirmationModal>
  )
}
