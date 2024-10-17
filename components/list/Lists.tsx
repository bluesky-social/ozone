import { ActionButton } from '@/common/buttons'
import { LabelChip, ModerationLabel } from '@/common/labels'
import { Loading } from '@/common/Loader'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { buildBlueSkyAppUrl } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'react-toastify'

export function Lists({ actor }: { actor: string }) {
  const labelerAgent = useLabelerAgent()
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()

  const { data, isLoading } = useInfiniteQuery({
    queryKey: ['lists', { actor }],
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.app.bsky.graph.getLists({
        actor,
        limit: 25,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  const lists = data?.pages.flatMap((page) => page.lists)

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    if (!lists?.length) return
    await addItemsToWorkspace(lists.map((f) => f.uri))
    if (!data?.pageParams) {
      setIsConfirmationOpen(false)
      return
    }
    setIsAdding(true)

    try {
      let cursor = data.pageParams[0] as string | undefined
      do {
        const nextLists = await labelerAgent.app.bsky.graph.getLists({
          actor,
          limit: 25,
          cursor,
        })
        await addItemsToWorkspace(nextLists.data.lists.map((f) => f.uri))
        cursor = nextLists.data.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && isConfirmationOpen)
    } catch (e) {
      toast.error(`Something went wrong: ${(e as Error).message}`)
    }
    setIsAdding(false)
    setIsConfirmationOpen(false)
  }

  if (isLoading) {
    return (
      <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl">
        <Loading />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl">
        <p>No lists found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      <div>
        {!!lists?.length && (
          <div className="mt-1 flex justify-end pb-4 text-gray-900 dark:text-gray-200">
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
              title={`Add lists to workspace?`}
              description={
                <>
                  Once confirmed, all the lists of the user will be added to the
                  workspace. For users with a lot of lists, this may take quite
                  some time but you can always stop the process and already
                  added lists will remain in the workspace.
                </>
              }
            />
          </div>
        )}
      </div>
      <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2 text-gray-900 dark:text-gray-200">
        {lists?.map((list) => (
          <div
            key={list.uri}
            className="relative rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm dark:shadow-slate-800 focus-within:ring-2 focus-within:ring-pink-500 focus-within:ring-teal-500 focus-within:ring-offset-2 hover:border-gray-400 dark:hover:border-slate-700"
          >
            <p>
              <Link
                href={`/repositories/${list.uri.replace('at://', '')}`}
                className="hover:underline"
              >
                <span>{list.name}</span>
              </Link>
              &nbsp;&middot;&nbsp;
              <a
                href={buildBlueSkyAppUrl({
                  did: list.creator.did,
                  collection: 'lists',
                  rkey: list.uri.split('/').pop(),
                })}
                target="_blank"
                rel="noreferrer"
                className="text-sm"
              >
                Peek
              </a>
            </p>
            <p className="text-sm">
              Created By{' '}
              <Link
                href={`/repositories/${list.creator.did}`}
                className="focus:outline-none"
              >
                <span>
                  {list.creator.displayName || ''}
                  {` @${list.creator.handle}`}
                </span>
              </Link>
            </p>
            {list.description && (
              <p className="text-sm text-gray-500 dark:text-gray-300">
                {list.description}
              </p>
            )}
            <div className="pt-2">
              <LabelChip className="bg-red-200 ml-0">
                {list.purpose.split('#')[1]}
              </LabelChip>
              {list.labels?.map((label) => (
                <ModerationLabel
                  recordAuthorDid={list.creator.did}
                  label={label}
                  key={label.val}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
