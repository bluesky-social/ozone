import { useState } from 'react'
import { AppBskyFeedDefs } from '@atproto/api'
import { TableCellsIcon, ListBulletIcon } from '@heroicons/react/20/solid'
import { PostsFeed } from './PostsFeed'
import { PostsTable } from './PostsTable'
import { ButtonGroup } from '../buttons'
import { EmptyFeed } from '../feeds/EmptyFeed'
import { Input } from '../forms'

enum Mode {
  Feed,
  Table,
}

export function Posts({
  items,
  onReport,
  onLoadMore,
  isFetching,
  setSearchQuery,
}: {
  items: AppBskyFeedDefs.FeedViewPost[]
  onReport: (uri: string) => void
  onLoadMore?: () => void
  isFetching: boolean
  setSearchQuery: (query: string) => void
}) {
  const [mode, setMode] = useState<Mode>(Mode.Feed)

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 sticky top-0">
        <div className="mx-auto max-w-3xl w-full sm:py-4 sm:px-6 lg:px-8 sm:flex sm:items-center sm:justify-between ">
          <div className="w-2/3">
            <Input
              name="search"
              className="w-full p-2"
              placeholder="Type keyword to search..."
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sm:flex mt-3 sm:mt-0 sm:ml-4">
            <ButtonGroup
              appearance="primary"
              items={[
                {
                  id: 'feed',
                  text: 'Feed',
                  Icon: ListBulletIcon,
                  onClick: () => setMode(Mode.Feed),
                  isActive: mode === Mode.Feed,
                },
                {
                  id: 'table',
                  text: 'Table',
                  Icon: TableCellsIcon,
                  onClick: () => setMode(Mode.Table),
                  isActive: mode === Mode.Table,
                  className:
                    mode === Mode.Table
                      ? 'bg-rose-600 text-white border-rose-800'
                      : 'bg-white text-gray-700 border-gray-300',
                },
              ]}
            />
          </div>
        </div>
      </div>
      {!isFetching && !items.length ? (
        <EmptyFeed />
      ) : (
        <>
          {mode === Mode.Feed ? (
            <div className="mx-auto max-w-3xl w-full py-2 sm:py-4 sm:px-6 lg:px-8">
              <PostsFeed
                items={items}
                onReport={onReport}
                onLoadMore={onLoadMore}
              />
            </div>
          ) : (
            <PostsTable
              items={items}
              onReport={onReport}
              onLoadMore={onLoadMore}
            />
          )}
        </>
      )}
    </div>
  )
}
