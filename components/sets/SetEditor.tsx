import { ToolsOzoneSetDefs } from '@atproto/api'
import { FormEvent, useState } from 'react'
import { toast } from 'react-toastify'

import { Alert } from '@/common/Alert'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input, Textarea } from '@/common/forms'
import client from '@/lib/client'
import { queryClient } from 'components/QueryClient'

const getSubmitButtonText = (
  set: ToolsOzoneSetDefs.Set | null,
  isSubmitting: boolean,
) => {
  if (!isSubmitting) {
    return !!set ? 'Update Set' : 'Add Set'
  }
  return !!set ? 'Updating Set...' : 'Adding Set...'
}

const useSetEditor = ({
  isNewSet,
  onSuccess,
}: {
  isNewSet: boolean
  onSuccess: () => void
}) => {
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
        client.api.tools.ozone.set.upsertSet(
          {
            name,
            description,
          },
          { encoding: 'application/json', headers: client.proxyHeaders() },
        ),
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
  set,
  onCancel,
  onSuccess,
}: {
  set: ToolsOzoneSetDefs.Set | null
  onCancel: () => void
  onSuccess: () => void
}) {
  const { onFormSubmit, submission } = useSetEditor({
    isNewSet: !set,
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
              autoFocus={!set}
              className="block w-full"
              disabled={!!set || submission.isSubmitting}
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
            <Textarea name="description" className="block w-full" />
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
            {getSubmitButtonText(set, submission.isSubmitting)}
          </ActionButton>
        </div>
        {submission.error && (
          <div className="mt-3">
            <Alert
              type="error"
              body={submission.error}
              title={!!set ? 'Failed to update set' : 'Failed to add set'}
            />
          </div>
        )}
      </form>
    </Card>
  )
}
