'use client'
import {
  AppBskyFeedFeedViewPost,
  AppBskyEmbedImages,
  AppBskyEmbedExternal,
} from '@atproto/api'
import Link from 'next/link'
import { LoadMore } from '../LoadMore'
import { isTrend, isRepost } from '../../../lib/types'

export function PostsTable({
  items,
  onLoadMore,
}: {
  items: AppBskyFeedFeedViewPost.Main[]
  onLoadMore: () => void
}) {
  return (
    <>
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
            >
              Author
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Content
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
            >
              Date
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {items.map((item, i) => (
            <PostAsRow key={`post-${i}`} item={item} />
          ))}
        </tbody>
      </table>
      <LoadMore onLoadMore={onLoadMore} />
    </>
  )
}

export function PostAsRow({ item }: { item: AppBskyFeedFeedViewPost.Main }) {
  return (
    <tr className="align-top">
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6">
        {isTrend(item.reason) ? (
          <span className="block text-gray-500">
            Trended by{' '}
            <Link href={`/accounts/view/${item.reason.by.handle}`}>
              @{item.reason.by.handle}
            </Link>
          </span>
        ) : undefined}
        {isRepost(item.reason) ? (
          <span className="block text-gray-500">
            Reposted by{' '}
            <Link href={`/accounts/view/${item.reason.by.handle}`}>
              @{item.reason.by.handle}
            </Link>
          </span>
        ) : undefined}
        <Link
          className="block"
          href={`/accounts/view/${item.post.author.handle}`}
        >
          @{item.post.author.handle}
        </Link>
        <dl className="font-normal lg:hidden">
          <dt className="sr-only">Content</dt>
          <dd className="mt-1">
            <PostContent item={item} />
          </dd>
          <dt className="sr-only sm:hidden">Date</dt>
          <dd className="mt-1 truncate text-gray-500 sm:hidden">
            {new Date(item.post.indexedAt).toLocaleString()}
          </dd>
        </dl>
      </td>
      <td className="hidden px-3 py-4 text-sm lg:table-cell">
        <PostContent item={item} />
        {/* TODO entities */}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell whitespace-nowrap">
        {new Date(item.post.indexedAt).toLocaleString()}
      </td>
      <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        <a href="#" className="text-gray-600 hover:text-blue-600 mr-4">
          View
        </a>
        <a href="#" className="text-gray-600 hover:text-rose-600">
          Report
        </a>
      </td>
    </tr>
  )
}

function PostContent({ item }: { item: AppBskyFeedFeedViewPost.Main }) {
  // TODO entities
  return (
    <>
      {item.reply ? (
        <span className="block text-gray-500 text-sm">
          Reply to{' '}
          <Link
            href={`/accounts/view/${item.reply.parent.author.handle}`}
            className="hover:underline"
          >
            @{item.reply.parent.author.handle}
          </Link>
        </span>
      ) : undefined}
      <span className="block">{item.post.record.text}</span>
      <PostEmbeds item={item} />
    </>
  )
}

function PostEmbeds({ item }: { item: AppBskyFeedFeedViewPost.Main }) {
  if (item.post.embed?.$type === 'app.bsky.embed.images#presented') {
    const embed = item.post.embed as AppBskyEmbedImages.Presented
    return (
      <span className="flex gap-2 pt-2">
        {embed.images.map((image, i) => (
          <a
            key={`img-${i}`}
            href={image.fullsize}
            target="_blank"
            rel="noreferrer"
          >
            <img
              className="w-20 h-20 border border-gray-200 rounded"
              src={image.thumb}
            />
          </a>
        ))}
      </span>
    )
  }
  if (item.post.embed?.$type === 'app.bsky.embed.external#presented') {
    const embed = item.post.embed as AppBskyEmbedExternal.Presented
    return (
      <span className="flex gap-2 pt-2">
        {embed.external.thumb ? (
          <img
            className="w-20 h-20 border border-gray-200 rounded"
            src={embed.external.thumb}
          />
        ) : undefined}
        <span className="block">
          <span className="block">{embed.external.title}</span>
          <span className="block">{embed.external.description}</span>
          <span className="block">
            <a
              className="text-gray-500"
              href={embed.external.uri}
              target="_blank"
              rel="noreferrer"
            >
              {embed.external.uri}
            </a>
          </span>
        </span>
      </span>
    )
  }
  return <span />
}
