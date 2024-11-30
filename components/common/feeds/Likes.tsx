import { AccountsGrid } from '@/repositories/AccountView'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LoadMoreButton } from '../LoadMoreButton'
import { usePdsAgent } from '@/shell/AuthContext'
import { ActionButton } from '../buttons'
import { ConfirmationModal } from '../modals/confirmation'
import { useEffect, useRef, useState } from 'react'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { toast } from 'react-toastify'
import { Agent } from '@atproto/api'
import { pluralize } from '@/lib/util'

const useLikes = (pdsAgent: Agent, uri: string, cid?: string) => {
  return useInfiniteQuery({
    queryKey: ['likes', { uri, cid }],
    queryFn: async ({ pageParam }) => {
      const { data } = await pdsAgent.app.bsky.feed.getLikes({
        uri,
        cid,
        limit: 50,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}

export const Likes = ({ uri, cid }: { uri: string; cid?: string }) => {
  const abortController = useRef<AbortController | null>(null)
  const pdsAgent = usePdsAgent()
  const { data, fetchNextPage, hasNextPage, error } = useLikes(
    pdsAgent,
    uri,
    cid,
  )
  const likes = data?.pages.flatMap((page) => page.likes) || []

  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    await addItemsToWorkspace(likes.map((l) => l.actor.did))
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
        const nextLikes = await pdsAgent.app.bsky.feed.getLikes(
          {
            uri,
            cid,
            cursor,
            limit: 50,
          },
          { signal: abortController.current?.signal },
        )
        const dids = nextLikes.data?.likes.map((l) => l.actor.did) || []
        if (dids.length) await addItemsToWorkspace(dids)
        cursor = nextLikes.data.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && isConfirmationOpen)
    } catch (e) {
      if (abortController.current?.signal.reason === 'user-cancelled') {
        toast.info('Stopped adding users to workspace')
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
    <>
      {!!likes?.length && (
        <div className="flex flex-row justify-end pt-2 mx-auto mt-2 max-w-5xl px-4 sm:px-6 lg:px-8">
          <ActionButton
            appearance="primary"
            size="sm"
            onClick={() => setIsConfirmationOpen(true)}
          >
            Add {pluralize(likes.length, 'user')} to workspace
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
            title={`Add users to workspace?`}
            description={
              <>
                Once confirmed, all the users who liked the post will be added
                to the workspace. For posts with a lot of likes, this may take
                quite some time but you can always stop the process and already
                added users will remain in the workspace.
              </>
            }
          />
        </div>
      )}

      <AccountsGrid
        error={error?.['message']}
        accounts={likes.map((l) => l.actor)}
      />
      {hasNextPage && (
        <div className="flex justify-center">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </>
  )
}
