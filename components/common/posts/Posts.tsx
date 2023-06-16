import { useState } from 'react'
import { AppBskyFeedDefs } from '@atproto/api'
import { TableCellsIcon, ListBulletIcon } from '@heroicons/react/20/solid'
import { PostsFeed } from './PostsFeed'
import { PostsTable } from './PostsTable'
import { ButtonGroup } from '../buttons'
import { EmptyFeed } from '../feeds/EmptyFeed'

enum Mode {
  Feed,
  Table,
}

export function Posts({
  items,
  title,
  onReport,
  onLoadMore,
  isFetching,
}: {
  items: AppBskyFeedDefs.FeedViewPost[]
  title: string
  onReport: (uri: string) => void
  onLoadMore?: () => void
  isFetching: boolean
}) {
  const [mode, setMode] = useState<Mode>(Mode.Feed)

  return (
    <div>
      <div className="bg-white border-b border-gray-200 py-2 px-4 sm:flex sm:items-center sm:justify-between sticky top-0">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
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
