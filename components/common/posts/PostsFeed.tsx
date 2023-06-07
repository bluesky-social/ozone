'use client'
import {
  AppBskyFeedDefs,
  AppBskyEmbedImages,
  AppBskyEmbedExternal,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedPost,
  AppBskyEmbedRecord,
  AppBskyActorDefs,
} from '@atproto/api'
import Link from 'next/link'
import {
  DocumentMagnifyingGlassIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { LoadMore } from '../LoadMore'
import { isRepost } from '@/lib/types'
import { RichText } from '../RichText'
import { LabelChip, LabelList, getLabelGroupInfo } from '../labels'

export function PostsFeed({
  items,
  onReport,
  onLoadMore,
}: {
  items: AppBskyFeedDefs.FeedViewPost[]
  onReport: (uri: string) => void
  onLoadMore?: () => void
}) {
  return (
    <div className="border border-gray-200 border-b-0">
      {items.map((item, i) => (
        <div
          key={`post-${i}`}
          className="bg-white border-b border-gray-200 pt-6 pb-4 px-4"
        >
          <PostAsCard item={item} onReport={onReport} />
        </div>
      ))}
      {onLoadMore && <LoadMore onLoadMore={onLoadMore} />}
    </div>
  )
}

export function PostAsCard({
  item,
  dense,
  controls = true,
  onReport,
  className = '',
  showLabels = true,
}: {
  item: AppBskyFeedDefs.FeedViewPost
  dense?: boolean
  controls?: boolean
  onReport?: (uri: string) => void
  className?: string
  showLabels?: boolean
}) {
  return (
    <div className={`bg-white ${className}`}>
      <PostHeader item={item} dense={dense} />
      <PostContent item={item} dense={dense} />
      <PostEmbeds item={item} />
      {showLabels && <PostLabels item={item} dense={dense} />}
      {controls && <PostControls item={item} onReport={onReport} />}
    </div>
  )
}

function PostHeader({
  item,
  dense,
}: {
  item: AppBskyFeedDefs.FeedViewPost
  dense?: boolean
}) {
  return (
    <div className={`${dense ? '' : 'pb-5'}`}>
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <img
            className={`${dense ? 'h-6 w-6' : 'h-10 w-10'} rounded-full`}
            src={item.post.author.avatar || '/img/default-avatar.jpg'}
            alt=""
          />
        </div>
        <div className="min-w-0 flex-1">
          {isRepost(item.reason) ? (
            <p className="block text-gray-500 text-sm">
              Reposted by @{item.reason.by.handle}
            </p>
          ) : undefined}
          <p className="text-sm font-medium text-gray-900">
            <Link
              href={`/repositories/${item.post.author.handle}`}
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
            <Link
              href={`/repositories/${item.post.uri.replace('at://', '')}`}
              className="text-gray-500 hover:underline"
            >
              {new Date(item.post.indexedAt).toLocaleString()}
            </Link>
            &nbsp;&middot;&nbsp;
            <a
              href={`https://bsky.app/profile/${item.post.uri
                .replace('at://', '')
                .replace('app.bsky.feed.post', 'post')}`}
              target="_blank"
              rel="noreferrer"
            >
              Peek
            </a>
          </p>
          {item.reply ? (
            <p className="text-gray-500 text-sm">
              Reply to{' '}
              <Link
                href={`/repositories/${
                  (
                    item.reply.parent
                      .author as AppBskyActorDefs.ProfileViewBasic
                  ).handle
                }`}
                className="hover:underline"
              >
                @
                {
                  (
                    item.reply.parent
                      .author as AppBskyActorDefs.ProfileViewBasic
                  ).handle
                }
              </Link>
            </p>
          ) : undefined}
        </div>
      </div>
    </div>
  )
}

function PostContent({
  item,
  dense,
}: {
  item: AppBskyFeedDefs.FeedViewPost
  dense?: boolean
}) {
  return (
    <div className={`${dense ? 'prose-sm pl-10' : 'prose pl-14'} pb-2`}>
      <RichText post={item.post.record as AppBskyFeedPost.Record} />
    </div>
  )
}

// @TODO record embeds
function PostEmbeds({ item }: { item: AppBskyFeedDefs.FeedViewPost }) {
  const embed = AppBskyEmbedRecordWithMedia.isView(item.post.embed)
    ? item.post.embed.media
    : item.post.embed

  // render image embeds
  if (AppBskyEmbedImages.isView(embed)) {
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
              alt={image.alt}
            />
          </a>
        ))}
      </div>
    )
  }
  // render external link embeds
  if (AppBskyEmbedExternal.isView(embed)) {
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
  // render quote posts embeds
  if (AppBskyEmbedRecord.isView(embed)) {
    if (
      AppBskyEmbedRecord.isViewRecord(embed.record) &&
      AppBskyFeedPost.isRecord(embed.record.value) &&
      AppBskyFeedPost.validateRecord(embed.record.value).success
    ) {
      return (
        <div className="flex gap-2 pb-2 pl-14 flex-col border-2 border-gray-400 border-dashed my-2 rounded pt-2">
          <div className="flex flex-row">
            <img
              className="w-6 h-6 rounded-full"
              src={embed.record.author.avatar || '/img/default-avatar.jpg'}
              alt={embed.record.author.avatar}
            />
            <p className="text-sm font-medium text-gray-900">
              <Link
                href={`/repositories/${embed.record.author.handle}`}
                className="hover:underline"
              >
                {embed.record.author.displayName ? (
                  <>
                    <span className="font-bold">
                      {embed.record.author.displayName}
                    </span>
                    <span className="ml-1 text-gray-500">
                      @{embed.record.author.handle}
                    </span>
                  </>
                ) : (
                  <span className="font-bold">
                    @{embed.record.author.handle}
                  </span>
                )}
              </Link>
              &nbsp;&middot;&nbsp;
              <Link
                href={`/repositories/${embed.record.uri.replace('at://', '')}`}
                className="text-gray-500 hover:underline"
              >
                {new Date(embed.record.indexedAt).toLocaleString()}
              </Link>
            </p>
          </div>
          <div className={`prose-sm pl-10 pb-2`}>
            <RichText post={embed.record.value} />
          </div>
        </div>
      )
    }
  }
  return <span />
}

function PostControls({
  item,
  onReport,
}: {
  item: AppBskyFeedDefs.FeedViewPost
  onReport?: (uri: string) => void
}) {
  return (
    <div className="flex gap-1 pl-10">
      <Link
        href={`/repositories/${item.post.uri.replace('at://', '')}`}
        className="flex flex-col items-center rounded-md px-4 pt-2 pb-1 text-gray-500 hover:bg-blue-100 hover:text-blue-700 cursor-pointer"
      >
        <DocumentMagnifyingGlassIcon className="w-6 h-6" />
        <span className="text-sm">View</span>
      </Link>
      <button
        type="button"
        className="flex flex-col items-center rounded-md px-4 pt-2 pb-1 text-gray-500 hover:bg-rose-100 hover:text-rose-700 cursor-pointer"
        onClick={() => onReport?.(item.post.uri)}
      >
        <ExclamationCircleIcon className="w-6 h-6" />
        <span className="text-sm">Report</span>
      </button>
    </div>
  )
}

function PostLabels({
  item,
  dense,
}: {
  item: AppBskyFeedDefs.FeedViewPost
  dense?: boolean
}) {
  const { labels, cid } = item.post
  if (!labels?.length) return null
  return (
    <LabelList className={`pb-2 ${dense ? 'pl-10' : 'pl-14'}`}>
      {labels?.map(({ val }, i) => {
        const labelGroup = getLabelGroupInfo(val)

        return (
          <LabelChip
            className={`${i === 0 ? 'ml-0' : ''} text-[${labelGroup.color}]`}
            // TODO: Ideally, we should just use inline class name but it only works when the class names are static
            // so trying to work around that with style prop for now
            style={{ color: labelGroup.color }}
            key={`${cid}_${val}`}
          >
            {val}
          </LabelChip>
        )
      })}
    </LabelList>
  )
}
