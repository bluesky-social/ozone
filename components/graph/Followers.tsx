import { ActionButton } from '@/common/buttons'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { AccountsGrid } from '@/repositories/AccountView'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

export function Followers({ id, count }: { id: string; count?: number }) {
  const abortController = useRef<AbortController | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const labelerAgent = useLabelerAgent()
  const [isAdding, setIsAdding] = useState(false)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()
  const { error, isLoading, data, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['followers', { id }],
      queryFn: async ({ pageParam }) => {
        const { data } = await labelerAgent.api.app.bsky.graph.getFollowers({
          actor: id,
          cursor: pageParam,
        })
        return data
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })

  const followers = data?.pages.flatMap((page) => page.followers) ?? []

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    await addItemsToWorkspace(followers.map((f) => f.did))
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
        const nextFollowers = await labelerAgent.app.bsky.graph.getFollowers(
          {
            actor: id,
            cursor,
          },
          { signal: abortController.current?.signal },
        )
        await addItemsToWorkspace(
          nextFollowers.data.followers.map((f) => f.did),
        )
        cursor = nextFollowers.data.cursor
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
      {!!count && (
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
            title={`Add followers to workspace?`}
            description={
              <>
                Once confirmed, all the followers of the user will be added to
                the workspace. For users with a lot of followers, this may take
                quite some time but you can always stop the process and already
                added followers will remain in the workspace.
              </>
            }
          />
        </div>
      )}

      <AccountsGrid
        isLoading={isLoading}
        error={String(error ?? '')}
        accounts={followers}
      />

      {hasNextPage && (
        <div className="flex justify-center mb-4">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </div>
  )
}
