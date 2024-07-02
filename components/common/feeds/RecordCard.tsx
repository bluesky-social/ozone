import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { Loading, LoadingFailed } from '@/common/Loader'
import { buildBlueSkyAppUrl } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export const FeedGeneratorRecordCard = ({ uri }: { uri: string }) => {
  const labelerAgent = useLabelerAgent()
  const { error, data, isFetching } = useQuery({
    retry: false,
    queryKey: ['feed-generator', { uri }],
    queryFn: async () => {
      const { data } = await labelerAgent.api.app.bsky.feed.getFeedGenerator({
        feed: uri,
      })
      return data
    },
  })

  if (isFetching) {
    return <Loading />
  }

  if (error) {
    return <LoadingFailed error={error} />
  }

  if (!data) {
    return <LoadingFailed error="Feed generator data not found!" />
  }

  const {
    isOnline,
    isValid,
    view: { displayName, likeCount, avatar, description, creator, indexedAt },
  } = data

  const meta: string[] = [`${likeCount} likes`]

  if (!isOnline) {
    meta.push('Offline')
  }

  if (!isValid) {
    meta.push('Invalid')
  }

  if (indexedAt) {
    meta.push(new Date(indexedAt as string).toLocaleString())
  }

  return (
    <div className="bg-white">
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <img
            className="h-6 w-6 rounded-full"
            // Probably should use a different default avatar for all feed generator app-wide
            src={avatar || '/img/default-avatar.jpg'}
            alt={`Avatar of feed generator ${displayName}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
            <>
              <Link
                href={`/repositories/${uri?.replace('at://', '')}`}
                className="hover:underline"
              >
                <span className="font-bold">{displayName}</span>
              </Link>
              <span className="ml-1">by</span>
              <Link href={`/repositories/${creator.did}`}>
                <span className="ml-1 text-gray-500 dark:text-gray-50">
                  @{creator.handle}
                </span>
              </Link>
            </>{' '}
            &nbsp;&middot;&nbsp;
            <a
              href={buildBlueSkyAppUrl({ did: creator.did })}
              target="_blank"
              rel="noreferrer"
            >
              Peek
            </a>
          </p>
        </div>
      </div>
      <div className="pb-2 pl-10 text-gray-500 dark:text-gray-50">
        {description && <p className="text-sm">{description}</p>}
        {!!meta.length && <p className="text-sm">{meta.join(' - ')}</p>}
      </div>
    </div>
  )
}
