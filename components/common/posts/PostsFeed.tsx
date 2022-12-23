'use client'
import {
  AppBskyFeedFeedViewPost,
  AppBskyEmbedImages,
  AppBskyEmbedExternal,
} from '@atproto/api'
import Link from 'next/link'
import {
  DocumentMagnifyingGlassIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { LoadMore } from '../LoadMore'
import { isTrend, isRepost } from '../../../lib/types'

export function PostsFeed({
  items,
  onLoadMore,
}: {
  items: AppBskyFeedFeedViewPost.Main[]
  onLoadMore: () => void
}) {
  return (
    <div className="border border-gray-200 border-b-0">
      {items.map((item, i) => (
        <div
          key={`post-${i}`}
          className="bg-white border-b border-gray-200 pt-6 pb-4 px-4"
        >
          <PostAsCard item={item} />
        </div>
      ))}
      <LoadMore onLoadMore={onLoadMore} />
    </div>
  )
}

export function PostAsCard({ item }: { item: AppBskyFeedFeedViewPost.Main }) {
  return (
    <div className="bg-white">
      <PostHeader item={item} />
      <PostContent item={item} />
      <PostEmbeds item={item} />
      <PostControls item={item} />
    </div>
  )
}

function PostHeader({ item }: { item: AppBskyFeedFeedViewPost.Main }) {
  return (
    <div className="bg-white pb-5">
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <img
            className="h-10 w-10 rounded-full"
            src={item.post.author.avatar || '/img/default-avatar.jpg'}
            alt=""
          />
        </div>
        <div className="min-w-0 flex-1">
          {isTrend(item.reason) ? (
            <p className="block text-gray-500 text-sm">
              Trended by @{item.reason.by.handle}
            </p>
          ) : undefined}
          {isRepost(item.reason) ? (
            <p className="block text-gray-500 text-sm">
              Reposted by @{item.reason.by.handle}
            </p>
          ) : undefined}
          <p className="text-sm font-medium text-gray-900">
            <Link
              href={`/accounts/view/${item.post.author.handle}`}
              className="hover:underline"
            >
              {item.post.author.displayName ? (
                <>
                  <span className="font-bold">
                    {item.post.author.displayName}
                  </span>
                  <span className="ml-1 text-gray-500">
                    @{item.post.author.handle}
                  </span>
                </>
              ) : (
                <span className="font-bold">@{item.post.author.handle}</span>
              )}
            </Link>
            &nbsp;&middot;&nbsp;
            <a href="#" className="text-gray-500 hover:underline">
              {new Date(item.post.indexedAt).toLocaleString()}
            </a>
          </p>
          {item.reply ? (
            <p className="text-gray-500 text-sm">
              Reply to{' '}
              <Link
                href={`/accounts/view/${item.reply.parent.author.handle}`}
                className="hover:underline"
              >
                @{item.reply.parent.author.handle}
              </Link>
            </p>
          ) : undefined}
        </div>
      </div>
    </div>
  )
}

function PostContent({ item }: { item: AppBskyFeedFeedViewPost.Main }) {
  // TODO entities
  return <div className="prose pl-14 pb-2">{item.post.record.text}</div>
}

function PostEmbeds({ item }: { item: AppBskyFeedFeedViewPost.Main }) {
  if (item.post.embed?.$type === 'app.bsky.embed.images#presented') {
    const embed = item.post.embed as AppBskyEmbedImages.Presented
    return (
      <div className="flex gap-2 pb-2 pl-14">
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
      </div>
    )
  }
  if (item.post.embed?.$type === 'app.bsky.embed.external#presented') {
    const embed = item.post.embed as AppBskyEmbedExternal.Presented
    return (
      <div className="flex gap-2 pb-2 pl-14">
        {embed.external.thumb ? (
          <img
            className="w-20 h-20 border border-gray-200 rounded"
            src={embed.external.thumb}
          />
        ) : undefined}
        <div>
          <div>{embed.external.title}</div>
          <div>{embed.external.description}</div>
          <div>
            <a
              className="text-gray-500"
              href={embed.external.uri}
              target="_blank"
              rel="noreferrer"
            >
              {embed.external.uri}
            </a>
          </div>
        </div>
      </div>
    )
  }
  return <span />
}

function PostControls({ item }: { item: AppBskyFeedFeedViewPost.Main }) {
  return (
    <div className="flex gap-1 pl-10">
      <div className="flex flex-col items-center rounded-md px-4 pt-2 pb-1 text-gray-500 hover:bg-blue-100 hover:text-blue-700 cursor-pointer">
        <DocumentMagnifyingGlassIcon className="w-6 h-6" />
        <span className="text-sm">View</span>
      </div>
      <div className="flex flex-col items-center rounded-md px-4 pt-2 pb-1 text-gray-500 hover:bg-rose-100 hover:text-rose-700 cursor-pointer">
        <ExclamationCircleIcon className="w-6 h-6" />
        <span className="text-sm">Report</span>
      </div>
    </div>
  )
}
