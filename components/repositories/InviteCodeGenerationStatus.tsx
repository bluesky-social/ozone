import { Dialog, Transition } from '@headlessui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'

import { ActionButton } from '../common/buttons'
import { LabelChip } from '../common/labels'
import client from '@/lib/client'

const useInviteCodeMutation = ({ did, id }) => {
  const queryClient = useQueryClient()
  const mutation = useMutation<{ success: boolean }, unknown, boolean, unknown>(
    async (disableInvites = true) => {
      const mutator = disableInvites
        ? 'disableAccountInvites'
        : 'enableAccountInvites'

      const result = await client.api.com.atproto.admin[mutator](
        { account: did },
        {
          headers: client.adminHeaders(),
          encoding: 'application/json',
        },
      )

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
}: {
  id: string
  did: string
  invitesDisabled?: boolean
}) => {
  const currentStatus = invitesDisabled ? 'Disabled' : 'Enabled'
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const toggleInviteCodes = useInviteCodeMutation({ did, id })
  let buttonText = invitesDisabled
    ? toggleInviteCodes.isLoading
      ? 'Enabling...'
      : 'Enable'
    : toggleInviteCodes.isLoading
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {invitesDisabled ? 'Enable' : 'Disable'} invite code
                    generation?
                  </Dialog.Title>

                  <Dialog.Description className="text-gray-600 mt-4">
                    This will {invitesDisabled ? 'enable' : 'stop'} invite
                    code generation for this user.
                    <br />
                    Remember, already generated invite codes will not be
                    activated/deactivated by this action.
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
                        toggleInviteCodes
                          .mutateAsync(invitesDisabled ? false : true)
                          .then(() => setIsDialogOpen(false))
                      }
                      disabled={toggleInviteCodes.isLoading ? true : false}
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
        <dt className="text-sm font-medium text-gray-500">
          Invite Code Generation
        </dt>
        <dd className="mt-1 text-sm text-gray-900" title={currentStatus}>
          <button onClick={() => setIsDialogOpen(true)}>
            <LabelChip
              className={`ml-0 text-white ${
                invitesDisabled ? 'bg-rose-600' : 'bg-green-400'
              }`}
            >
              {currentStatus}
            </LabelChip>
          </button>
        </dd>
      </div>
    </>
  )
}
