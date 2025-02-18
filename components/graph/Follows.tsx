import { LoadMoreButton } from '@/common/LoadMoreButton'
import { AccountsGrid } from '@/repositories/AccountView'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { SubjectToWorkspaceAction } from '@/workspace/SubjectsToWorkspaceAction'
import { useInfiniteQuery } from '@tanstack/react-query'

export function Follows({ id, count }: { id: string; count?: number }) {
  const labelerAgent = useLabelerAgent()
  const { error, data, isLoading, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['follows', { id }],
      queryFn: async ({ pageParam }) => {
        const { data } = await labelerAgent.app.bsky.graph.getFollows({
          actor: id,
          cursor: pageParam,
        })
        return data
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })
  const follows = data?.pages.flatMap((page) => page.follows) ?? []

  const getSubjectsNextPage = async () => {
    const { data, hasNextPage } = await fetchNextPage()
    if (data?.pages?.length) {
      const lastPage = data?.pages[data.pages.length - 1]
      const subjects = lastPage?.follows.map((l) => l.did) || []
      return { subjects, hasNextPage }
    }

    return { subjects: [], hasNextPage: false }
  }

  return (
    <div>
      {!!count && (
        <div className="flex flex-row justify-end pt-2 mx-auto mt-2 max-w-5xl px-4 sm:px-6 lg:px-8">
          <SubjectToWorkspaceAction
            hasNextPage={hasNextPage}
            initialSubjects={follows.map((f) => f.did)}
            getSubjectsNextPage={getSubjectsNextPage}
            description={
              <>
                Once confirmed, all the users this user follows will be added to
                the workspace. For users with a lot of follows, this may take
                quite some time but you can always stop the process and already
                added follows will remain in the workspace.
              </>
            }
          />
        </div>
      )}

      <AccountsGrid
        isLoading={isLoading}
        error={String(error ?? '')}
        accounts={follows}
      />

      {hasNextPage && (
        <div className="flex justify-center mb-4">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </div>
  )
}
