import React from 'react'
import { useSeverityLevelEditor } from './useSeverityLevel'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { DocumentCheckIcon } from '@heroicons/react/24/solid'

export const SeverityLevelEditor = ({
  onCancel,
  onSuccess,
}: {
  onSuccess: () => void
  onCancel: () => void
}) => {
  const { onSubmit, mutation } = useSeverityLevelEditor()
  return (
    <form
      onSubmit={(e) => {
        onSubmit(e).then(onSuccess).catch(onCancel)
      }}
    >
      <FormLabel label="Name" htmlFor="name" className="flex-1 mb-3">
        <Input
          type="text"
          id="name"
          name="name"
          required
          placeholder="Name of the severity level (e.g., sev-1, sev-2)"
          className="block w-full"
        />
      </FormLabel>
      <FormLabel
        required
        label="Description"
        htmlFor="description"
        className="flex-1 mb-3"
      >
        <Textarea
          required
          id="description"
          name="description"
          className="block w-full"
          placeholder="Description of this severity level"
        />
      </FormLabel>
      <div className="flex flex-wrap gap-3 mb-3">
        <FormLabel
          label="Strike Count"
          htmlFor="strikeCount"
          className="flex-1 min-w-[200px]"
        >
          <Input
            type="number"
            id="strikeCount"
            name="strikeCount"
            min="0"
            placeholder="Number of strikes (optional)"
            className="block w-full"
          />
        </FormLabel>
        <FormLabel
          label="First Occurrence Strike Count"
          htmlFor="firstOccurrenceStrikeCount"
          className="flex-1 min-w-[200px]"
        >
          <Input
            type="number"
            id="firstOccurrenceStrikeCount"
            name="firstOccurrenceStrikeCount"
            min="0"
            placeholder="Strikes on first offense (optional)"
            className="block w-full"
          />
        </FormLabel>
        <FormLabel
          label="Strike On Occurrence"
          htmlFor="strikeOnOccurrence"
          className="flex-1 min-w-[200px]"
        >
          <Input
            type="number"
            id="strikeOnOccurrence"
            name="strikeOnOccurrence"
            min="1"
            placeholder="Apply on which occurrence (optional)"
            className="block w-full"
          />
        </FormLabel>
        <FormLabel
          label="Strike Expiry (days)"
          htmlFor="expiryInDays"
          className="flex-1 min-w-[200px]"
        >
          <Input
            type="number"
            id="expiryInDays"
            name="expiryInDays"
            min="0"
            placeholder="Days until expiry (optional)"
            className="block w-full"
          />
        </FormLabel>
      </div>

      <Checkbox
        value="true"
        id="needsTakedown"
        name="needsTakedown"
        className="mb-3 flex items-center"
        label="Requires takedown action"
      />

      <div className="flex flex-row items-center gap-2">
        <ActionButton
          size="sm"
          appearance="primary"
          type="submit"
          disabled={mutation.isLoading}
        >
          <DocumentCheckIcon className="h-4 w-4 mr-2" />
          Save Severity Level
        </ActionButton>
        <ActionButton
          size="sm"
          appearance="outlined"
          type="button"
          disabled={mutation.isLoading}
          onClick={onCancel}
        >
          Cancel
        </ActionButton>
      </div>
    </form>
  )
}
