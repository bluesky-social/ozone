import { LoadMoreButton } from '@/common/LoadMoreButton'
import { AccountsGrid } from '@/repositories/AccountView'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { SubjectToWorkspaceAction } from '@/workspace/SubjectsToWorkspaceAction'
import { useInfiniteQuery } from '@tanstack/react-query'

export function Followers({ id, count }: { id: string; count?: number }) {
  const labelerAgent = useLabelerAgent()
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
  const getSubjectsNextPage = async () => {
    const { data, hasNextPage } = await fetchNextPage()
    if (data?.pages?.length) {
      const lastPage = data?.pages[data.pages.length - 1]
      const subjects = lastPage?.followers.map((l) => l.did) || []
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
            initialSubjects={followers.map((f) => f.did)}
            getSubjectsNextPage={getSubjectsNextPage}
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
