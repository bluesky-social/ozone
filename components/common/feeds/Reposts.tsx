import { AccountsGrid } from '@/repositories/AccountView'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LoadMoreButton } from '../LoadMoreButton'
import { usePdsAgent } from '@/shell/AuthContext'
import { SubjectToWorkspaceAction } from '@/workspace/SubjectsToWorkspaceAction'

const useReposts = (uri: string, cid?: string) => {
  const pdsAgent = usePdsAgent()
  return useInfiniteQuery({
    queryKey: ['reposts', { uri, cid }],
    queryFn: async ({ pageParam }) => {
      const { data } = await pdsAgent.api.app.bsky.feed.getRepostedBy({
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

export const Reposts = ({ uri, cid }: { uri: string; cid?: string }) => {
  const { data, fetchNextPage, hasNextPage } = useReposts(uri, cid)
  const accounts = data?.pages.flatMap((page) => page.repostedBy) || []
  const repostedByDids = accounts.map((l) => l.did)

  const getSubjectsNextPage = async () => {
    const { data, hasNextPage } = await fetchNextPage()
    if (data?.pages?.length) {
      const lastPage = data?.pages[data.pages.length - 1]
      const subjects = lastPage?.repostedBy.map((l) => l.did) || []
      return { subjects, hasNextPage }
    }

    return { subjects: [], hasNextPage: false }
  }
  return (
    <>
      <SubjectToWorkspaceAction
        hasNextPage={hasNextPage}
        initialSubjects={repostedByDids}
        getSubjectsNextPage={getSubjectsNextPage}
        description={
          <>
            Once confirmed, all the users who reposted the post will be added to
            the workspace. For posts with a lot of reposts, this may take quite
            some time but you can always stop the process and already added
            users will remain in the workspace.
          </>
        }
      />
      <AccountsGrid error="" accounts={accounts} />
      {hasNextPage && (
        <div className="flex justify-center">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </>
  )
}
