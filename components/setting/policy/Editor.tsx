import React from 'react'
import { usePolicyListEditor } from './usePolicyList'
import { FormLabel, Input, Textarea } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { DocumentCheckIcon } from '@heroicons/react/24/solid'

export const PolicyEditor = ({
  onCancel,
  onSuccess,
}: {
  onSuccess: () => void
  onCancel: () => void
}) => {
  const { onSubmit, mutation } = usePolicyListEditor()
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
          placeholder="Name of the policy. Only alphabets are allowed."
          className="block w-full"
          pattern="[A-Za-z ]+"
        />
      </FormLabel>
      <FormLabel label="Name" htmlFor="name" className="flex-1 mb-3">
        <Textarea
          required
          id="description"
          name="description"
          className="block w-full"
          placeholder="Additional details about the policy"
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
          Save Policy
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
