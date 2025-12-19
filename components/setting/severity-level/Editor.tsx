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

      <FormLabel
        label="Content action email summary"
        htmlFor="contentEmailSummary"
        className="flex-1 mb-3"
      >
        <Textarea
          id="contentEmailSummary"
          name="contentEmailSummary"
          className="block w-full"
          placeholder="Email summary for content actions (optional)"
        />
      </FormLabel>

      <FormLabel
        label="Content action email bullets"
        htmlFor="contentEmailBullets"
        className="flex-1 mb-3"
      >
        <Textarea
          id="contentEmailBullets"
          name="contentEmailBullets"
          className="block w-full"
          placeholder="Email bullet points for content actions (optional)"
        />
      </FormLabel>

      <FormLabel
        label="Account action email summary"
        htmlFor="accountEmailSummary"
        className="flex-1 mb-3"
      >
        <Textarea
          id="accountEmailSummary"
          name="accountEmailSummary"
          className="block w-full"
          placeholder="Email summary for account actions (optional)"
        />
      </FormLabel>

      <FormLabel
        label="Account action email bullets"
        htmlFor="accountEmailBullets"
        className="flex-1 mb-3"
      >
        <Textarea
          id="accountEmailBullets"
          name="accountEmailBullets"
          className="block w-full"
          placeholder="Email bullet points for account actions (optional)"
        />
      </FormLabel>

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
