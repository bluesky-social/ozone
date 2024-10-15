import { ToolsOzoneTeamDefs } from '@atproto/api'
import { FormEvent, useState } from 'react'
import { toast } from 'react-toastify'

import { Alert } from '@/common/Alert'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { Checkbox, FormLabel, Input, Select } from '@/common/forms'
import { getDidFromHandle } from '@/lib/identity'
import { MemberRoleNames } from './Role'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQueryClient } from '@tanstack/react-query'

const getSubmitButtonText = (
  member: ToolsOzoneTeamDefs.Member | null,
  isSubmitting: boolean,
) => {
  if (!isSubmitting) {
    return !!member ? 'Update Member' : 'Add Member'
  }
  return !!member ? 'Updating Member...' : 'Adding Member...'
}

const useMemberEditor = ({
  isNewMember,
  onSuccess,
}: {
  isNewMember: boolean
  onSuccess: () => void
}) => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

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
      let didOrHandle = formData.get(
        isNewMember ? 'identifier' : 'did',
      ) as string
      const role = formData.get('role') as ToolsOzoneTeamDefs.Member['role']
      let did = didOrHandle

      if (didOrHandle.startsWith('@') || didOrHandle.includes('.')) {
        const didFromHandle = await getDidFromHandle(didOrHandle)
        if (!didFromHandle) {
          setSubmission({
            isSubmitting: false,
            error: `Could not resolve handle ${didOrHandle}`,
          })
          return
        }
        did = didFromHandle
      }

      // Normally we wouldn't use <any> but the result of the request does not change
      // anything in the UI so we don't need to type it
      let request: Promise<unknown>
      if (isNewMember) {
        request = labelerAgent.api.tools.ozone.team.addMember({
          did,
          role,
        })
      } else {
        const disabled = formData.get('disabled') === 'true'
        request = labelerAgent.api.tools.ozone.team.updateMember({
          did,
          role,
          disabled,
        })
      }

      await toast.promise(request, {
        pending: 'Saving member...',
        success: {
          render() {
            return isNewMember
              ? 'New member added'
              : 'Member updated successfully'
          },
        },
        error: {
          render() {
            return isNewMember
              ? 'Error adding new member'
              : 'Error updating member'
          },
        },
      })
      queryClient.invalidateQueries(['memberList'])
      setSubmission({ isSubmitting: false, error: '' })
      ev.target.reset()
      onSuccess()
    } catch (err) {
      setSubmission({ isSubmitting: false, error: (err as Error).message })
    }
  }

  return { onFormSubmit, submission }
}

export function MemberEditor({
  member,
  onCancel,
  onSuccess,
}: {
  member: ToolsOzoneTeamDefs.Member | null
  onCancel: () => void
  onSuccess: () => void
}) {
  const { onFormSubmit, submission } = useMemberEditor({
    isNewMember: !member,
    onSuccess,
  })
  return (
    <Card className="mb-3">
      <form action="" onSubmit={onFormSubmit}>
        <div className="mb-3">
          <FormLabel label="Handle/DID" htmlFor="identifier" className="flex-1">
            {member && <input value={member.did} hidden name="did" />}
            <Input
              required
              type="text"
              id="identifier"
              name="identifier"
              autoFocus={!member}
              className="block w-full"
              value={member?.did}
              disabled={!!member || submission.isSubmitting}
              placeholder="member.bsky.social or did:plc:...."
            />
          </FormLabel>
        </div>
        <div className="flex flex-row items-center mb-3 gap-4">
          <div className="">
            <FormLabel label="Role" htmlFor="role" className="flex-1">
              <Select
                required
                id="role"
                name="role"
                autoFocus={!!member}
                disabled={submission.isSubmitting}
              >
                {Object.entries(MemberRoleNames).map(([role, name]) => (
                  <option
                    key={role}
                    value={role}
                    selected={member?.role === role}
                  >
                    {name}
                  </option>
                ))}
              </Select>
            </FormLabel>
          </div>
          {!!member && (
            <div>
              <FormLabel
                label="Access Control"
                htmlFor="disabled"
                className="flex-1"
              >
                <Checkbox
                  value="true"
                  id="disabled"
                  name="disabled"
                  className="mb-3 flex items-center"
                  disabled={submission.isSubmitting}
                  label="Disable access for this member"
                />
              </FormLabel>
            </div>
          )}
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
            {getSubmitButtonText(member, submission.isSubmitting)}
          </ActionButton>
        </div>
        {submission.error && (
          <div className="mt-3">
            <Alert
              type="error"
              body={submission.error}
              title={
                !!member ? 'Failed to update member' : 'Failed to add member'
              }
            />
          </div>
        )}
      </form>
    </Card>
  )
}
