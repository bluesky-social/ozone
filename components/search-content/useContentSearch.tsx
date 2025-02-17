import { useAppviewAgent, useLabelerAgent } from '@/shell/ConfigurationContext'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import {
  AppBskyActorDefs,
  AppBskyActorSearchActors,
  AppBskyFeedDefs,
  AppBskyFeedSearchPosts,
} from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'

type ActorResult = AppBskyActorSearchActors.OutputSchema
type PostResult = AppBskyFeedSearchPosts.OutputSchema
export type SearchContentSection = 'people' | 'top' | 'latest'
type QueryData<S extends SearchContentSection> = S extends 'people'
  ? ActorResult
  : PostResult

export const useContentSearch = ({
  term,
  section,
}: {
  term: string
  section: SearchContentSection
}) => {
  const labelerAgent = useLabelerAgent()
  const appviewAgent = useAppviewAgent()

  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()

  const searchInfo = useInfiniteQuery<QueryData<typeof section>>({
    queryKey: ['searchContent', { term, section }],
    enabled: !!term,
    queryFn: async ({ pageParam }) => {
      if (section === 'people') {
        // This is actually never hit, we always have appview configured
        if (!appviewAgent) {
          throw new Error(
            'Can not search actors without appview agent configured',
          )
        }

        const { data } = await appviewAgent.app.bsky.actor.searchActors({
          q: term,
          limit: 100,
          cursor: pageParam,
        })

        return data
      }

      const { data } = await labelerAgent.app.bsky.feed.searchPosts({
        q: term,
        limit: 100,
        sort: section,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  const data =
    (section === 'people'
      ? (searchInfo.data?.pages.flatMap(
          (page) => page.actors,
        ) as ActorResult['actors'])
      : (searchInfo.data?.pages.flatMap(
          (page) => page.posts,
        ) as PostResult['posts'])) || []

  return {
    ...searchInfo,
    data,
    addToWorkspace,
  }
}

export function isActorData(
  data: ActorResult['actors'] | PostResult['posts'],
): data is ActorResult['actors'] {
  return data.length === 0 || 'did' in data[0]
}
