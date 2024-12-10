import { ActionButton } from '@/common/buttons'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { AccountsGrid } from '@/repositories/AccountView'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

type ListAccountsProps = {
  uri: string
}

const useListAccounts = ({ uri }: ListAccountsProps) => {
  const labelerAgent = useLabelerAgent()

  const abortController = useRef<AbortController | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()

  const { data, error, isLoading, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['list-accounts', { uri }],
      queryFn: async ({ pageParam }) => {
        const { data } = await labelerAgent.app.bsky.graph.getList({
          list: uri,
          limit: 50,
          cursor: pageParam,
        })
        return {
          cursor: data.cursor,
          profiles: data.items.map(({ subject }) => subject),
        }
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })
  const profiles = data?.pages.flatMap((page) => page.profiles)

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    if (profiles?.length) {
      await addItemsToWorkspace(profiles.map((f) => f.did))
    }
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
        const netItems = await labelerAgent.app.bsky.graph.getList(
          {
            list: uri,
            cursor,
          },
          { signal: abortController.current?.signal },
        )
        await addItemsToWorkspace(netItems.data.items.map((f) => f.subject.did))
        cursor = netItems.data.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && isConfirmationOpen)
    } catch (e) {
      if (abortController.current?.signal.reason === 'user-cancelled') {
        toast.info('Stopped adding list members to workspace')
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

  return {
    profiles,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isAdding,
    setIsAdding,
    isConfirmationOpen,
    confirmAddToWorkspace,
    setIsConfirmationOpen,
  }
}

export default function ListAccounts({ uri }: ListAccountsProps) {
  const {
    isConfirmationOpen,
    setIsConfirmationOpen,
    profiles,
    isLoading,
    error,
    isAdding,
    setIsAdding,
    fetchNextPage,
    hasNextPage,
    confirmAddToWorkspace,
  } = useListAccounts({ uri })

  return (
    <div>
      <div className="flex flex-row mx-auto mt-4 max-w-5xl px-4 sm:px-6 lg:px-8 justify-end">
        <ActionButton
          size="sm"
          disabled={!profiles?.length}
          title={
            !profiles?.length
              ? 'No users to be added to workspace'
              : 'All users will be added to workspace'
          }
          appearance={!!profiles?.length ? 'primary' : 'outlined'}
          onClick={() => setIsConfirmationOpen(true)}
        >
          Add all to workspace
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
          title={`Add to workspace?`}
          description={
            <>
              Once confirmed, all users in this list will be added to the
              workspace. If there are a lot of users in the list, this may take
              quite some time but you can always stop the process and already
              added users will remain in the workspace.
            </>
          }
        />
      </div>

      <AccountsGrid
        isLoading={isLoading}
        error={String(error ?? '')}
        accounts={profiles}
      />

      {hasNextPage && (
        <div className="flex justify-center mb-4">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </div>
  )
}
