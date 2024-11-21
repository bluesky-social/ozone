import { LoadMoreButton } from '@/common/LoadMoreButton'
import { AppBskyActorDefs } from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AccountsGrid } from './AccountView'
import { listRecords } from './api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useEffect, useRef, useState } from 'react'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { toast } from 'react-toastify'
import { ActionButton } from '@/common/buttons'
import { ConfirmationModal } from '@/common/modals/confirmation'

export function Blocks({ did }: { did: string }) {
  const labelerAgent = useLabelerAgent()
  const abortController = useRef<AbortController | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()

  const { data, error, fetchNextPage, hasNextPage, isInitialLoading } =
    useInfiniteQuery({
      queryKey: ['blocks', { did }],
      queryFn: async ({ pageParam }) => {
        const data = await listRecords(did, 'app.bsky.graph.block', {
          cursor: pageParam,
        })
        const actors = data.records.map(
          (record) => record.value['subject'] as string,
        )
        if (!actors.length) {
          return { accounts: [], cursor: null }
        }
        const { data: profileData } =
          await labelerAgent.app.bsky.actor.getProfiles({
            actors,
          })

        const accounts: AppBskyActorDefs.ProfileViewDetailed[] = []
        actors.forEach((did) => {
          const profile = profileData.profiles.find((p) => p.did === did)
          if (profile) {
            accounts.push(profile)
          }
        })

        return {
          accounts,
          cursor: data.cursor,
        }
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
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

      <AccountsGrid
        isLoading={isInitialLoading}
        error={String(error ?? '')}
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
