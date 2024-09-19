import { LabelChip, ModerationLabel } from '@/common/labels'
import { Loading } from '@/common/Loader'
import { buildBlueSkyAppUrl } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'

export function Lists({ actor }: { actor: string }) {
  const labelerAgent = useLabelerAgent()

  const { data, isLoading } = useInfiniteQuery({
    queryKey: ['lists', { actor }],
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.api.app.bsky.graph.getLists({
        actor,
        limit: 25,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

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

  const lists = data.pages.flatMap((page) => page.lists)

  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2 text-gray-900 dark:text-gray-200">
        {lists.map((list) => (
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
