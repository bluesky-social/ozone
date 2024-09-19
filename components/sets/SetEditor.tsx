import { ToolsOzoneSetDefs } from '@atproto/api'
import { FormEvent, useState } from 'react'
import { toast } from 'react-toastify'

import { Alert } from '@/common/Alert'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input, Textarea } from '@/common/forms'
import { useQueryClient } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

const getSubmitButtonText = (setName: string | null, isSubmitting: boolean) => {
  if (!isSubmitting) {
    return !!setName ? `Update Set` : 'Add Set'
  }
  return !!setName ? `Updating Set...` : 'Adding Set...'
}

const useSetEditor = ({
  isNewSet,
  onSuccess,
}: {
  isNewSet: boolean
  onSuccess: () => void
}) => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()
  const [submission, setSubmission] = useState<{
    isSubmitting: boolean
    error: string
  }>({ isSubmitting: false, error: '' })

  const onFormSubmit = async (
    ev: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    ev.preventDefault()
    try {
      setSubmission({ isSubmitting: true, error: '' })
      const formData = new FormData(ev.currentTarget)
      let name = formData.get('name') as string
      const description = formData.get('description') as string

      await toast.promise(
        labelerAgent.tools.ozone.set.upsertSet({
          name,
          description,
        }),
        {
          pending: 'Saving set...',
          success: {
            render() {
              return 'Set saved successfully'
            },
          },
          error: {
            render() {
              return 'Error saving set'
            },
          },
        },
      )
      queryClient.invalidateQueries(['setList'])
      setSubmission({ isSubmitting: false, error: '' })
      ev.target.reset()
      onSuccess()
    } catch (err) {
      setSubmission({ isSubmitting: false, error: (err as Error).message })
    }
  }

  return { onFormSubmit, submission }
}

export function SetEditor({
  setName,
  setDescription,
  onCancel,
  onSuccess,
}: {
  setName: string | null
  setDescription: string | null
  onCancel: () => void
  onSuccess: () => void
}) {
  const { onFormSubmit, submission } = useSetEditor({
    isNewSet: !setName,
    onSuccess,
  })
  return (
    <Card className="mb-3">
      <form action="" onSubmit={onFormSubmit}>
        <div className="mb-3">
          <FormLabel label="Name" htmlFor="name" className="flex-1">
            <Input
              required
              type="text"
              id="name"
              name="name"
              autoFocus={!setName}
              className="block w-full"
              defaultValue={setName || ''}
              disabled={submission.isSubmitting}
              placeholder="No spaces or special characters..."
            />
          </FormLabel>
        </div>
        <div className="flex flex-row items-center mb-3 gap-4">
          <FormLabel
            label="Description"
            htmlFor="description"
            className="flex-1"
          >
            <Textarea
              name="description"
              defaultValue={setDescription || ''}
              className="block w-full"
            />
          </FormLabel>
        </div>
        <div className="flex flex-row justify-end gap-2">
          <ActionButton
            size="sm"
            type="button"
            appearance="outlined"
            onClick={onCancel}
            disabled={submission.isSubmitting}
          >
            Cancel
          </ActionButton>
          <ActionButton
            size="sm"
            type="submit"
            appearance="primary"
            disabled={submission.isSubmitting}
          >
            {getSubmitButtonText(setName, submission.isSubmitting)}
          </ActionButton>
        </div>
        {submission.error && (
          <div className="mt-3">
            <Alert
              type="error"
              body={submission.error}
              title={!!setName ? 'Failed to update set' : 'Failed to add set'}
            />
          </div>
        )}
      </form>
    </Card>
  )
}
