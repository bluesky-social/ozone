import { Dialog, Transition } from '@headlessui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'

import { Alert } from '@/common/Alert'
import { ActionButton } from '@/common/buttons'
import { Checkbox, Textarea } from '@/common/forms'
import { LabelChip } from '@/common/labels'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

const useInviteCodeMutation = ({ did, id }) => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()

  const mutation = useMutation<
    { success: boolean },
    unknown,
    {
      disableInvites: boolean
      note?: string
      disableExistingCodes?: boolean
    },
    unknown
  >(
    async ({ disableInvites = true, note, disableExistingCodes = false }) => {
      const mutator = disableInvites
        ? 'disableAccountInvites'
        : 'enableAccountInvites'

      const result = await labelerAgent.api.com.atproto.admin[mutator]({
        account: did,
        note,
      })

      // When disabling invites, check if moderator wants to also disable existing codes
      // If yes, get invite codes through getRepo and disable the active ones
      if (disableInvites && disableExistingCodes) {
        await labelerAgent.api.com.atproto.admin.disableInviteCodes({
          accounts: [did],
        })
      }

      return result
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['accountView', { id }] })
      },
    },
  )

  return mutation
}

export const InviteCodeGenerationStatus = ({
  id,
  did,
  invitesDisabled = false,
  inviteNote,
}: {
  id: string
  did: string
  inviteNote?: string
  invitesDisabled?: boolean
}) => {
  const currentStatus = invitesDisabled ? 'Disabled' : 'Enabled'
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [note, setNote] = useState('')
  const [disableExistingCodes, setDisableExistingCodes] = useState(false)
  const toggleAccountInvites = useInviteCodeMutation({ did, id })
  let buttonText = invitesDisabled
    ? toggleAccountInvites.isLoading
      ? 'Enabling...'
      : 'Enable'
    : toggleAccountInvites.isLoading
    ? 'Disabling...'
    : 'Disable'

  return (
    <>
      <Transition appear show={isDialogOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsDialogOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl dark:shadow-xs dark:shadow-slate-900 transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50"
                  >
                    {invitesDisabled ? 'Enable' : 'Disable'} invite code
                    generation?
                  </Dialog.Title>

                  <Dialog.Description className="text-gray-600 dark:text-gray-200 mt-4">
                    This will {invitesDisabled ? 'enable' : 'stop'} invite code
                    generation for this user.
                    <br />
                    {invitesDisabled ? (
                      <p>
                        Remember, this will not affect already disabled invite
                        codes.
                      </p>
                    ) : (
                      <p className="pt-2">
                        Optionally, you can also choose to disable already
                        generated invite codes by checking the box below. It may
                        take a bit longer to disable existing invite codes so,
                        please be patient.
                      </p>
                    )}
                  </Dialog.Description>

                  <Dialog.Description>
                    <Textarea
                      autoFocus
                      name="note"
                      value={note}
                      className="w-full mt-4"
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={`Provide a reason for ${
                        invitesDisabled ? 'enabling' : 'disabling'
                      } invite code generation`}
                    />

                    {!invitesDisabled && (
                      <Checkbox
                        id="disableExistingCodes"
                        name="disableExistingCodes"
                        className="mb-3 flex items-center"
                        checked={disableExistingCodes}
                        onChange={() =>
                          setDisableExistingCodes((current) => !current)
                        }
                        label="Disable all available invite codes"
                      />
                    )}

                    {toggleAccountInvites.isError && (
                      <Alert
                        type="error"
                        title="Something went wrong"
                        body={toggleAccountInvites.error?.['message']}
                      />
                    )}
                  </Dialog.Description>

                  <div className="mt-4 flex flex-row justify-end">
                    <ActionButton
                      appearance="outlined"
                      className="mr-2"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </ActionButton>
                    <ActionButton
                      appearance="primary"
                      onClick={() =>
                        toggleAccountInvites
                          .mutateAsync({
                            disableInvites: invitesDisabled ? false : true,
                            disableExistingCodes,
                            note,
                          })
                          .then(() => {
                            setIsDialogOpen(false)
                            setNote('')
                          })
                      }
                      disabled={toggleAccountInvites.isLoading ? true : false}
                    >
                      {buttonText}
                    </ActionButton>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      <div className="sm:col-span-1">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-50">
          Invite Code Generation
        </dt>
        <dd
          className="mt-1 text-sm text-gray-900 dark:text-gray-200"
          title={currentStatus}
        >
          <button onClick={() => setIsDialogOpen(true)}>
            <LabelChip
              className={`ml-0 text-white ${
                invitesDisabled
                  ? 'bg-rose-600'
                  : 'bg-green-400 dark:bg-lime-400'
              }`}
            >
              {currentStatus}
            </LabelChip>
          </button>
          {!!inviteNote && <p className="mt-1">{inviteNote}</p>}
        </dd>
      </div>
    </>
  )
}
