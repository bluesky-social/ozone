import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Loading, LoadingFailed } from '@/common/Loader'
import { buildBlueSkyAppUrl, parseAtUri } from '@/lib/util'
import { AppBskyGraphDefs } from '@atproto/api'
import { SOCIAL_APP_URL, STARTER_PACK_OG_CARD_URL } from '@/lib/constants'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export const StarterPackRecordCard = ({ uri }: { uri: string }) => {
  const lablerAgent = useLabelerAgent()
  const { error, data, isFetching } = useQuery({
    retry: false,
    queryKey: ['starterpack', uri],
    queryFn: async () => {
      const { data } = await lablerAgent.api.app.bsky.graph.getStarterPack({
        starterPack: uri,
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
    starterPack: {
      creator,
      list,
      feeds,
      joinedWeekCount,
      joinedAllTimeCount,
      indexedAt,
      record,
    },
  } = data
  const displayName = record['name'] || 'Untitled'
  const rkey = uri.split('/').pop()

  const meta: string[] = [
    `${joinedWeekCount} Joined last week`,
    `${joinedAllTimeCount} Joined all time`,
    `${feeds?.length || 'No'} feed(s) included`,
  ]

  if (indexedAt) {
    meta.push(new Date(indexedAt as string).toLocaleString())
  }

  return (
    <div className="bg-white dark:bg-slate-800">
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <img
            className="h-6 w-6 rounded-full"
            // Probably should use a different default avatar for all feed generator app-wide
            src={creator.avatar || '/img/default-avatar.jpg'}
            alt={`Avatar of the creator of starter pack ${displayName}`}
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
      <div className="pb-2 pl-10">
        <a
          href={`${SOCIAL_APP_URL}/start/${creator.handle}/${rkey}`}
          target="_blank"
        >
          <img
            className="rounded"
            src={`${STARTER_PACK_OG_CARD_URL}/${creator.did}/${rkey}`}
            alt="Starter pack OG card"
          />
        </a>
        {!!feeds?.length && (
          <div className="text-gray-800 dark:text-gray-300">
            <h5 className="font-bold">Feeds</h5>
            <ul>
              {feeds.map((feed) => (
                <li key={feed.did} className="flex items-center">
                  <Link href={`/repositories/${feed.uri.replace('at://', '')}`}>
                    {feed.displayName}
                  </Link>
                  &nbsp;&middot;&nbsp;
                  <a
                    href={buildBlueSkyAppUrl({
                      did: feed.creator.did,
                      collection: 'feed',
                      rkey: feed.uri.split('/').pop(),
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm"
                  >
                    Peek
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!list && <ListSummary list={list} />}
        {!!meta.length && (
          <p className="text-sm text-gray-500">{meta.join(' - ')}</p>
        )}
      </div>
    </div>
  )
}

const ListSummary = ({ list }: { list: AppBskyGraphDefs.ListViewBasic }) => {
  const listUri = parseAtUri(list.uri)
  if (!listUri) {
    return null
  }
  const { did, rkey } = listUri

  return (
    <div className="text-gray-800 dark:text-gray-300">
      <h5 className="font-bold">List</h5>
      <div className="flex items-center">
        <Link href={`/repositories/${list.uri.replace('at://', '')}`}>
          {list.name}
        </Link>
        &nbsp;&middot;&nbsp;
        {list.listItemCount} members &nbsp;&middot;&nbsp;
        <a
          href={buildBlueSkyAppUrl({
            did,
            rkey: rkey || '',
            collection: 'lists',
          })}
          target="_blank"
          rel="noreferrer"
          className="text-sm"
        >
          Peek
        </a>
      </div>
    </div>
  )
}
