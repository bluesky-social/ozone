import { useState } from 'react'
import { AppBskyFeedDefs } from '@atproto/api'
import { TableCellsIcon, ListBulletIcon } from '@heroicons/react/20/solid'
import { PostsFeed } from './PostsFeed'
import { PostsTable } from './PostsTable'
import { ButtonGroup } from '../buttons'
import { EmptyFeed } from '../feeds/EmptyFeed'
import { Input } from '../forms'
import { PostFilter } from './Filter'
import { TypeFilterKey } from './constants'
import { Loading } from '../Loader'
import { Alert } from '../Alert'

enum Mode {
  Feed,
  Table,
}

export function Posts({
  isFromAppview,
  items,
  onReport,
  onLoadMore,
  isFetching,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  isAuthorDeactivated,
  isAuthorTakendown,
}: {
  isFromAppview?: boolean
  items: AppBskyFeedDefs.FeedViewPost[]
  onReport: (uri: string) => void
  onLoadMore?: () => void
  isFetching: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  typeFilter: TypeFilterKey
  setTypeFilter: (type: TypeFilterKey) => void
  isAuthorDeactivated: boolean
  isAuthorTakendown: boolean
}) {
  const [mode, setMode] = useState<Mode>(Mode.Feed)

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 sticky top-0">
        <div className="mx-auto max-w-3xl w-full py-4 sm:px-6 lg:px-8 sm:flex sm:items-start sm:justify-between ">
          <div className="sm:w-2/3 flex gap-1">
            <Input
              name="search"
              value={searchQuery}
              className="sm:w-1/3 md:w-2/3 p-2"
              placeholder="Type keyword to search..."
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {!searchQuery && (
              <PostFilter
                selectedType={typeFilter}
                setSelectedType={setTypeFilter}
              />
            )}
          </div>
          <div className="sm:flex mt-3 sm:mt-0">
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

      {isFromAppview && (
        <div className="mx-auto max-w-3xl w-full pt-2 sm:pt-4 sm:px-6 lg:px-8">
          <Alert
            type="warning"
            title="Posts sourced from appview"
            body={`The user may have blocked your labeler so the posts were loaded directly from appview without authentication. This may cause takendown posts to not show up in the feed.`}
          />
        </div>
      )}

      {!isFetching && !items.length ? (
        <EmptyFeed />
      ) : (
        <>
          {mode === Mode.Feed ? (
            <div className="mx-auto max-w-3xl w-full py-2 sm:py-4 sm:px-6 lg:px-8">
              <PostsFeed
                isAuthorDeactivated={isAuthorDeactivated}
                isAuthorTakendown={isAuthorTakendown}
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
          {isFetching && <Loading />}
        </>
      )}
    </div>
  )
}
