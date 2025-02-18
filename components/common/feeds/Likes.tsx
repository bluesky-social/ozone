import { AccountsGrid } from '@/repositories/AccountView'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LoadMoreButton } from '../LoadMoreButton'
import { usePdsAgent } from '@/shell/AuthContext'
import { Agent } from '@atproto/api'
import { SubjectToWorkspaceAction } from '@/workspace/SubjectsToWorkspaceAction'

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
  const pdsAgent = usePdsAgent()
  const { data, fetchNextPage, hasNextPage, error } = useLikes(
    pdsAgent,
    uri,
    cid,
  )

  const likes = data?.pages.flatMap((page) => page.likes) || []
  const likedByDids = likes.map((l) => l.actor.did)
  const getSubjectsNextPage = async () => {
    const { data, hasNextPage } = await fetchNextPage()
    if (data?.pages?.length) {
      const lastPage = data?.pages[data.pages.length - 1]
      const subjects = lastPage?.likes.map((l) => l.actor.did) || []
      return { subjects, hasNextPage }
    }

    return { subjects: [], hasNextPage: false }
  }

  return (
    <>
      <div className="flex flex-row justify-end pt-2 mx-auto mt-2 max-w-5xl px-4 sm:px-6 lg:px-8">
        <SubjectToWorkspaceAction
          hasNextPage={hasNextPage}
          initialSubjects={likedByDids}
          getSubjectsNextPage={getSubjectsNextPage}
          description={
            <>
              Once confirmed, all the users who liked the post will be added to
              the workspace. For posts with a lot of likes, this may take quite
              some time but you can always stop the process and already added
              users will remain in the workspace.
            </>
          }
        />
      </div>
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
