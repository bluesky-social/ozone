import { useState } from 'react'
import { AppBskyFeedFeedViewPost } from '@atproto/api'
import { TableCellsIcon, ListBulletIcon } from '@heroicons/react/20/solid'
import { PostsFeed } from './PostsFeed'
import { PostsTable } from './PostsTable'
import { classNames } from '../../../lib/util'

enum Mode {
  Feed,
  Table,
}

export function Posts({
  items,
  title,
  onReport,
  onLoadMore,
}: {
  items: AppBskyFeedFeedViewPost.Main[]
  title: string
  onReport: (uri: string) => void
  onLoadMore: () => void
}) {
  const [mode, setMode] = useState<Mode>(Mode.Feed)

  return (
    <div>
      <div className="bg-white border-b border-gray-200 py-2 px-4 sm:flex sm:items-center sm:justify-between sticky top-0">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
        <div className="sm:flex mt-3 sm:mt-0 sm:ml-4">
          <span className="isolate inline-flex rounded-md shadow-sm sm:ml-4 my-2 sm:my-0">
            <button
              type="button"
              className={classNames(
                'relative inline-flex items-center rounded-l-md border px-4 py-2 text-sm font-medium',
                mode === Mode.Feed
                  ? 'bg-rose-600 text-white border-rose-800'
                  : 'bg-white text-gray-700 border-gray-300',
              )}
              onClick={() => setMode(Mode.Feed)}
            >
              <ListBulletIcon className="w-5 h-5 mr-1" aria-hidden="true" />
              Feed
            </button>
            <button
              type="button"
              className={classNames(
                'relative -ml-px inline-flex items-center rounded-r-md border px-4 py-2 text-sm font-medium',
                mode === Mode.Table
                  ? 'bg-rose-600 text-white border-rose-800'
                  : 'bg-white text-gray-700 border-gray-300',
              )}
              onClick={() => setMode(Mode.Table)}
            >
              <TableCellsIcon className="w-5 h-5 mr-1" aria-hidden="true" />
              Table
            </button>
          </span>
        </div>
      </div>
      {mode === Mode.Feed ? (
        <div className="mx-auto max-w-3xl w-full py-2 sm:py-4 sm:px-6 lg:px-8">
          <PostsFeed
            items={items}
            onReport={onReport}
            onLoadMore={onLoadMore}
          />
        </div>
      ) : (
        <PostsTable items={items} onReport={onReport} onLoadMore={onLoadMore} />
      )}
    </div>
  )
}
