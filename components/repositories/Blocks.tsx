import { LoadMoreButton } from '@/common/LoadMoreButton'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AccountsGrid } from './AccountView'
import { getProfiles, listRecords } from './api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useEffect, useRef, useState } from 'react'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { toast } from 'react-toastify'
import { ActionButton } from '@/common/buttons'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { Alert } from '@/common/Alert'

export function Blocks({ did }: { did: string }) {
  const labelerAgent = useLabelerAgent()
  const abortController = useRef<AbortController | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()

  const { data, error, fetchNextPage, hasNextPage, isInitialLoading, refetch } =
    useInfiniteQuery({
      queryKey: ['blocks', { did }],
      queryFn: async ({ pageParam }) => {
        const data = await listRecords(did, 'app.bsky.graph.block', {
          cursor: pageParam,
        })

        if (data.error) {
          throw new Error(data.message || 'Error fetching blocks')
        }

        const actors = (data.records || []).map(
          (record) => record.value['subject'] as string,
        )
        if (!actors.length) {
          return { accounts: [], cursor: null }
        }
        const profiles = await getProfiles(labelerAgent, actors)

        return {
          accounts: Array.from(profiles.values()),
          cursor: data.cursor,
        }
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
      retry: 2,
    })
  const blockedAccounts = data?.pages.flatMap((page) => page.accounts) ?? []

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    await addItemsToWorkspace(blockedAccounts.map((f) => f.did))
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
        const data = await listRecords(
          did,
          'app.bsky.graph.block',
          { cursor },
          { signal: abortController.current?.signal },
        )

        console.log(data)
        await addItemsToWorkspace(
          data.records.map((record) => record.value['subject'] as string),
        )
        cursor = data.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && isConfirmationOpen)
    } catch (e) {
      if (abortController.current?.signal.reason === 'user-cancelled') {
        toast.info('Stopped adding blocked accounts to workspace')
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

  useEffect(() => {
    // User cancelled by closing this view (navigation, other?)
    return () => abortController.current?.abort('user-cancelled')
  }, [])

  return (
    <div>
      {!!blockedAccounts?.length && (
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
            title={`Add all blocked accounts to workspace?`}
            description={
              <>
                Once confirmed, all the accounts blocked by this user will be
                added to the workspace. For users with a lot of blocks, this may
                take quite some time but you can always stop the process and
                already added follows will remain in the workspace.
              </>
            }
          />
        </div>
      )}

      {!!error && !isInitialLoading && (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <Alert
            type="error"
            title="Failed to load blocked accounts"
            body={
              <>
                {error instanceof Error ? error.message : 'Unknown error'}
                <button className="ml-1 underline" onClick={() => refetch()}>
                  Click here
                </button>{' '}
                to retry.
              </>
            }
          />
        </div>
      )}

      <AccountsGrid
        isLoading={isInitialLoading}
        error={''}
        accounts={blockedAccounts}
      />

      {hasNextPage && (
        <div className="flex justify-center py-6">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </div>
  )
}
