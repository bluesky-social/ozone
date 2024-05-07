import { ToolsOzoneModeratorDefs } from '@atproto/api'
import { FormEvent, useState } from 'react'
import { toast } from 'react-toastify'

import { Alert } from '@/common/Alert'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { Checkbox, FormLabel, Input, Select } from '@/common/forms'
import client from '@/lib/client'
import { getDidFromHandle } from '@/lib/identity'
import { queryClient } from 'components/QueryClient'
import { ModeratorRoleNames } from './Role'

const useUserEditor = ({
  isNewUser,
  onSuccess,
}: {
  isNewUser: boolean
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
      let didOrHandle = formData.get(isNewUser ? 'identifier' : 'did') as string
      const role = formData.get('role') as ToolsOzoneModeratorDefs.User['role']
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
      let request: Promise<any>
      if (isNewUser) {
        request = client.api.tools.ozone.moderator.addUser({
          did,
          role,
        })
      } else {
        const disabled = formData.get('disabled') === 'true'
        request = client.api.tools.ozone.moderator.updateUser({
          did,
          role,
          disabled,
        })
      }

      await toast.promise(request, {
        pending: 'Saving user...',
        success: {
          render() {
            return isNewUser ? 'New user added' : 'User updated successfully'
          },
        },
        error: {
          render() {
            return isNewUser ? 'Error adding new user' : 'Error updating user'
          },
        },
      })
      queryClient.invalidateQueries(['userList'])
      setSubmission({ isSubmitting: false, error: '' })
      ev.target.reset()
      onSuccess()
    } catch (err) {
      setSubmission({ isSubmitting: false, error: (err as Error).message })
    }
  }

  return { onFormSubmit, submission }
}

export function UserEditor({
  user,
  onSuccess,
}: {
  user: ToolsOzoneModeratorDefs.User | null
  onSuccess: () => void
}) {
  const { onFormSubmit, submission } = useUserEditor({
    isNewUser: !user,
    onSuccess,
  })
  return (
    <Card className="mb-3">
      <form action="" onSubmit={onFormSubmit}>
        <div className="mb-3">
          <FormLabel label="Handle/DID" htmlFor="identifier" className="flex-1">
            {user && <input value={user.did} hidden name="did" />}
            <Input
              required
              type="text"
              id="identifier"
              name="identifier"
              autoFocus={!user}
              className="block w-full"
              value={user?.did}
              disabled={!!user || submission.isSubmitting}
              placeholder="user.bsky.social or did:plc:...."
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
                autoFocus={!!user}
                disabled={submission.isSubmitting}
              >
                {Object.entries(ModeratorRoleNames).map(([role, name]) => (
                  <option
                    key={role}
                    value={role}
                    selected={user?.role === role}
                  >
                    {name}
                  </option>
                ))}
              </Select>
            </FormLabel>
          </div>
          {!!user && (
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
                  label="Disable access for this user"
                />
              </FormLabel>
            </div>
          )}
        </div>
        <div className="flex flex-row justify-end">
          <ActionButton
            size="sm"
            type="submit"
            appearance="primary"
            disabled={submission.isSubmitting}
          >
            {!submission.isSubmitting
              ? !!user
                ? 'Update User'
                : 'Add User'
              : !!user
              ? 'Updating User...'
              : 'Adding User...'}
          </ActionButton>
        </div>
        {submission.error && (
          <div className="mt-3">
            <Alert
              type="error"
              body={submission.error}
              title={!!user ? 'Failed to update user' : 'Failed to add user'}
            />
          </div>
        )}
      </form>
    </Card>
  )
}
