'use client'
import { useGraphicMediaPreferences } from '@/config/useLocalPreferences'
import { classNames } from '@/lib/util'
import { AppBskyFeedDefs } from '@atproto/api'
import Link from 'next/link'
import { LoadMore } from '../LoadMore'
import { extractEmbeds } from './helpers'
import { ReplyParent } from './ReplyParent'
import { EmbedRenderer } from './PostsFeed'

export function PostsTable({
  items,
  onReport,
  onLoadMore,
}: {
  items: AppBskyFeedDefs.FeedViewPost[]
  onReport: (uri: string) => void
  onLoadMore?: () => void
}) {
  return (
    <>
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50 dark:bg-slate-800">
          <tr>
            <th
              scope="col"
              className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6"
            >
              Author
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 lg:table-cell"
            >
              Content
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:table-cell"
            >
              Date
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-800">
          {items.map((item, i) => (
            <PostAsRow key={`post-${i}`} item={item} onReport={onReport} />
          ))}
        </tbody>
      </table>
      {onLoadMore && <LoadMore onLoadMore={onLoadMore} />}
    </>
  )
}

export function PostAsRow({
  item,
  onReport,
}: {
  item: AppBskyFeedDefs.FeedViewPost
  onReport?: (uri: string) => void
}) {
  return (
    <tr className="align-top">
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:w-auto sm:max-w-none sm:pl-6">
        {AppBskyFeedDefs.isReasonRepost(item.reason) ? (
          <span className="block text-gray-500 dark:text-gray-50">
            Reposted by{' '}
            <Link href={`/repositories/${item.reason.by.did}`}>
              @{item.reason.by.handle}
            </Link>
          </span>
        ) : undefined}
        <Link className="block" href={`/repositories/${item.post.author.did}`}>
          @{item.post.author.handle}
        </Link>
        <dl className="font-normal lg:hidden">
          <dt className="sr-only">Content</dt>
          <dd className="mt-1">
            <PostContent item={item} />
          </dd>
          <dt className="sr-only sm:hidden">Date</dt>
          <dd className="mt-1 truncate text-gray-500 dark:text-gray-50 sm:hidden">
            {new Date(item.post.indexedAt).toLocaleString()}
          </dd>
        </dl>
      </td>
      <td className="hidden px-3 py-4 text-sm lg:table-cell">
        <PostContent item={item} />
        {/* TODO entities */}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-50 sm:table-cell whitespace-nowrap">
        {new Date(item.post.indexedAt).toLocaleString()}
      </td>
      <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        <Link
          href={`/repositories/${item.post.uri.replace('at://', '')}`}
          className="text-gray-600 dark:text-gray-50 hover:text-blue-600 mr-4"
        >
          View
        </Link>
        <button
          type="button"
          onClick={() => onReport?.(item.post.uri)}
          className="text-gray-600 dark:text-gray-50 hover:text-rose-600"
        >
          Report
        </button>
      </td>
    </tr>
  )
}

function PostContent({ item }: { item: AppBskyFeedDefs.FeedViewPost }) {
  // TODO entities
  return (
    <>
      {item.reply ? <ReplyParent reply={item.reply} inline /> : undefined}
      <span className="block dark:text-gray-300">
        {item.post.record.text as string}
      </span>
      <PostEmbeds item={item} />
    </>
  )
}

function PostEmbeds({ item }: { item: AppBskyFeedDefs.FeedViewPost }) {
  const { getMediaFiltersForLabels } = useGraphicMediaPreferences()

  const embeds = extractEmbeds(item.post)

  const mediaFilters = getMediaFiltersForLabels(
    item.post.labels?.map(({ val }) => val),
  )
  const imageClassName = classNames(
    `border border-gray-200 rounded`,
    mediaFilters.blur ? 'blur-sm hover:blur-none' : '',
    mediaFilters.grayscale ? 'grayscale' : '',
    mediaFilters.translucent ? 'opacity-50 ' : '',
  )

  return embeds.map((embed, i) => (
    <EmbedRenderer
      key={embed?.$type || i}
      embed={embed}
      item={item}
      mediaFilters={mediaFilters}
      imageClassName={imageClassName}
    />
  ))
}
