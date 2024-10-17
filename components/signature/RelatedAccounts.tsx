import { ActionButton } from '@/common/buttons'
import { LabelChip } from '@/common/labels'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { ToolsOzoneSignatureFindRelatedAccounts } from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

export function RelatedAccounts({ id }: { id: string }) {
  const abortController = useRef<AbortController | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const labelerAgent = useLabelerAgent()
  const [isAdding, setIsAdding] = useState(false)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()
  const { error, isLoading, data, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['related_accounts', { id }],
      queryFn: async ({ pageParam }) => {
        const { data } =
          await labelerAgent.tools.ozone.signature.findRelatedAccounts({
            did: id,
            cursor: pageParam,
          })
        return data
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })

  const accounts = data?.pages.flatMap((page) => page.accounts) ?? []

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    await addItemsToWorkspace(accounts.map((a) => a.account.did))
    if (!data?.pageParams) {
      setIsConfirmationOpen(false)
      return
    }
    setIsAdding(true)
    const newAbortController = new AbortController()
    abortController.current = newAbortController

    try {
      let cursor = data.pageParams[0] as string | undefined
      do {
        const nextAccounts =
          await labelerAgent.tools.ozone.signature.findRelatedAccounts(
            {
              did: id,
              cursor,
            },
            { signal: abortController.current?.signal },
          )
        await addItemsToWorkspace(
          nextAccounts.data.accounts.map((a) => a.account.did),
        )
        cursor = nextAccounts.data.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && isConfirmationOpen)
    } catch (e) {
      if (abortController.current?.signal.reason === 'user-cancelled') {
        toast.info('Stopped adding followers to workspace')
      } else {
        toast.error(`Something went wrong: ${(e as Error).message}`)
      }
    }
    setIsAdding(false)
    setIsConfirmationOpen(false)
  }

  useEffect(() => {
    if (!isConfirmationOpen) {
      abortController.current?.abort('user-cancelled')
    }
  }, [isConfirmationOpen])

  return (
    <div>
      {accounts && (
        <div className="flex flex-row justify-end pt-2 mx-auto mt-2 max-w-5xl px-4 sm:px-6 lg:px-8">
          <ActionButton
            appearance="primary"
            size="sm"
            onClick={() => setIsConfirmationOpen(true)}
          >
            Add to workspace
          </ActionButton>

          <ConfirmationModal
            onConfirm={() => {
              if (isAdding) {
                setIsAdding(false)
                setIsConfirmationOpen(false)
                return
              }

              confirmAddToWorkspace()
            }}
            isOpen={isConfirmationOpen}
            setIsOpen={setIsConfirmationOpen}
            confirmButtonText={isAdding ? 'Stop adding' : 'Yes, add all'}
            title={`Add related accounts to workspace?`}
            description={
              <>
                Once confirmed, all the related accounts will be added to the
                workspace. For users with many related accounts, this may take
                quite some time but you can always stop the process and already
                added accounts will remain in the workspace.
              </>
            }
          />
        </div>
      )}

      <RelatedAccountsList
        isLoading={isLoading}
        error={String(error ?? '')}
        accounts={accounts}
      />

      {hasNextPage && (
        <div className="flex justify-center mb-4">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </div>
  )
}

export function RelatedAccountsList({
  error,
  isLoading,
  accounts,
}: {
  error: string
  isLoading?: boolean
  accounts?: ToolsOzoneSignatureFindRelatedAccounts.RelatedAccount[]
}) {
  if (isLoading) {
    return (
      <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl dark:text-gray-300">
        Loading...
      </div>
    )
  }
  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      {!!error && (
        <div className="mt-1 dark:text-gray-300">
          <p>{error}</p>
        </div>
      )}
      <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {accounts?.map((account) => (
          <div
            key={account.account.did}
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-5 shadow-sm dark:shadow-slate-800 focus-within:ring-2 focus-within:ring-pink-500 focus-within:ring-teal-500 focus-within:ring-offset-2 hover:border-gray-400 dark:hover:border-slate-700"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/repositories/${account.account.did}`}
                className="focus:outline-none"
              >
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                  {`@${account.account.handle}`}
                </p>

                {account.similarities?.map(({ property }) => (
                  <LabelChip key={property}>{property}</LabelChip>
                ))}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
