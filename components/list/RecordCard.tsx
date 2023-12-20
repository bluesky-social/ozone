import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Loading, LoadingFailed } from '@/common/Loader'
import client from '@/lib/client'
import { buildBlueSkyAppUrl } from '@/lib/util'

export const ListRecordCard = ({ uri }: { uri: string }) => {
  const { error, data, isFetching } = useQuery({
    retry: false,
    queryKey: ['list', uri],
    queryFn: async () => {
      const { data } = await client.api.app.bsky.graph.getList({
        list: uri,
        limit: 1,
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
    return <LoadingFailed error="List data not found!" />
  }

  const rkey = uri.split('/').pop()
  const { name, purpose, indexedAt, avatar, creator, description } = data.list

  const meta: string[] = [purpose.split('#')[1]]

  if (indexedAt) {
    meta.push(new Date(indexedAt as string).toLocaleString())
  }

  return (
    <div className="bg-white">
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <img
            className="h-6 w-6 rounded-full"
            // Probably should use a different default avatar for all lists app-wide
            src={avatar || '/img/default-avatar.jpg'}
            alt={`Avatar of list ${name}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">
            <>
              <Link
                href={`/repositories/${uri?.replace('at://', '')}`}
                className="hover:underline"
              >
                <span className="font-bold">{name}</span>
              </Link>
              <span className="ml-1">by</span>
              <Link href={`/repositories/${creator.handle}`}>
                <span className="ml-1 text-gray-500">@{creator.handle}</span>
              </Link>
            </>{' '}
            &nbsp;&middot;&nbsp;
            <a
              href={buildBlueSkyAppUrl({
                did: creator.did,
                collection: 'lists',
                rkey,
              })}
              target="_blank"
              rel="noreferrer"
            >
              Peek
            </a>
          </p>
        </div>
      </div>
      <div className="pb-2 pl-10">
        {description && <p className="text-sm text-gray-500">{description}</p>}
        {!!meta.length && (
          <p className="text-sm text-gray-500">{meta.join(' - ')}</p>
        )}
      </div>
    </div>
  )
}
