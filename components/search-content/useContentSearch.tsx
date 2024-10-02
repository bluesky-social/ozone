import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { useInfiniteQuery } from '@tanstack/react-query'

export const useContentSearch = ({
  term,
  section,
}: {
  term: string
  section: string
}) => {
  const labelerAgent = useLabelerAgent()

  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()

  const searchInfo = useInfiniteQuery({
    queryKey: ['searchContent', { term, section }],
    enabled: !!term,
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.app.bsky.feed.searchPosts({
        q: term,
        limit: 30,
        sort: section,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  const posts = searchInfo.data?.pages.flatMap((page) => page.posts) || []

  return {
    ...searchInfo,
    posts,
    addToWorkspace,
  }
}
