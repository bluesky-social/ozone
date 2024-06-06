'use client'
import { useEffect, useState } from 'react'
import {
  AppBskyFeedDefs,
  AppBskyEmbedImages,
  AppBskyEmbedExternal,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedPost,
  AppBskyEmbedRecord,
} from '@atproto/api'
import Link from 'next/link'
import {
  DocumentMagnifyingGlassIcon,
  ExclamationCircleIcon,
  LanguageIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { LoadMore } from '../LoadMore'
import { isRepost } from '@/lib/types'
import { buildBlueSkyAppUrl, classNames, parseAtUri } from '@/lib/util'
import { getActionClassNames } from '@/reports/ModerationView/ActionHelpers'
import { RichText } from '../RichText'
import { LabelList, doesLabelNeedBlur, ModerationLabel } from '../labels'
import { CollectionId } from '@/reports/helpers/subject'
import { ProfileAvatar } from '@/repositories/ProfileAvatar'
import { getTranslatorLink, isPostInLanguage } from '@/lib/locale/helpers'
import { MOD_EVENTS } from '@/mod-event/constants'
import { SOCIAL_APP_URL } from '@/lib/constants'
import { ReplyParent } from './ReplyParent'

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
    <div className="border border-gray-200 dark:border-slate-700 border-b-0">
      {items.map((item, i) => (
        <div
          key={`post-${i}`}
          className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 pt-6 pb-4 px-4"
        >
          <PostAsCard item={item} onReport={onReport} dense />
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
    <div className={`bg-white dark:bg-slate-800 ${className}`}>
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
          <ProfileAvatar
            profile={item.post.author}
            className={`${dense ? 'h-6 w-6' : 'h-10 w-10'} rounded-full`}
          />
        </div>
        <div className="min-w-0 flex-1">
          {isRepost(item.reason) ? (
            <p className="block text-gray-500 dark:text-gray-50 text-sm">
              Reposted by @{item.reason.by.handle}
            </p>
          ) : undefined}
          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
            <Link
              href={`/repositories/${item.post.author.did}`}
              className="hover:underline"
            >
              {item.post.author.displayName ? (
                <>
                  <span className="font-bold">
                    {item.post.author.displayName}
                  </span>
                  <span className="ml-1 text-gray-500 dark:text-gray-50">
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
              className="text-gray-500 dark:text-gray-50 hover:underline"
            >
              {new Date(item.post.indexedAt).toLocaleString()}
            </Link>
            &nbsp;&middot;&nbsp;
            <a
              href={`${SOCIAL_APP_URL}/profile/${item.post.uri
                .replace('at://', '')
                .replace(CollectionId.Post, 'post')}`}
              target="_blank"
              rel="noreferrer"
            >
              Peek
            </a>
          </p>
          {item.reply ? <ReplyParent reply={item.reply} /> : undefined}
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
  const { takedownId, uri } = item.post
  const [needsTranslation, setNeedsTranslation] = useState(false)
  const primaryLanguage = 'en'
  const translatorUrl = getTranslatorLink(
    primaryLanguage,
    (item.post.record as undefined | { text?: string })?.text || '',
  )
  const showActionLine = needsTranslation || !!takedownId
  useEffect(() => {
    isPostInLanguage(item.post, [primaryLanguage]).then((isPostInPrimaryLang) =>
      setNeedsTranslation(!isPostInPrimaryLang),
    )
  }, [uri])
  return (
    <div
      className={`${
        dense ? 'prose-sm pl-10' : 'prose pl-14'
      } pb-2 dark:text-gray-100`}
    >
      <RichText post={item.post.record as AppBskyFeedPost.Record} />
      {showActionLine && (
        <p className="text-xs mt-0">
          {!!takedownId && (
            <Link
              className={`${getActionClassNames({
                action: MOD_EVENTS.TAKEDOWN,
                prop: 'text',
              })}`}
              href={`/actions/${takedownId}`}
            >
              Taken Down
            </Link>
          )}
          {needsTranslation && (
            <a
              href={translatorUrl}
              target="_blank"
              rel="noreferrer"
              className={classNames(
                `text-blue-600`,
                takedownId ? 'pl-1 ml-1 border-gray-400 border-l' : '',
              )}
            >
              <LanguageIcon className="w-3 h-3 inline mr-1" />
              Translate
            </a>
          )}
        </p>
      )}
    </div>
  )
}

const getImageSizeClass = (imageCount: number) =>
  imageCount < 3 ? 'w-32 h-32' : 'w-20 h-20'

function ImageAltText({ alt }: { alt: string }) {
  if (!alt) return null
  return (
    <p className="leading-2 text-gray-400 text-xs leading-3 mt-1">
      <InformationCircleIcon className="w-4 h-4 inline mr-1" />
      {alt}
    </p>
  )
}

export function PostEmbeds({ item }: { item: AppBskyFeedDefs.FeedViewPost }) {
  const embed = AppBskyEmbedRecordWithMedia.isView(item.post.embed)
    ? item.post.embed.media
    : item.post.embed

  const imageRequiresBlur = doesLabelNeedBlur(
    item.post.labels?.map(({ val }) => val),
  )
  const imageClassName = classNames(
    `border border-gray-200 rounded`,
    imageRequiresBlur ? 'blur-sm hover:blur-none' : '',
  )

  // render image embeds
  if (AppBskyEmbedImages.isView(embed)) {
    const embeddedImageClassName = classNames(
      imageClassName,
      getImageSizeClass(embed.images?.length || 0),
    )
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
              className={embeddedImageClassName}
              src={image.thumb}
              alt={image.alt}
            />
            <ImageAltText alt={image.alt} />
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
            className={classNames(imageClassName, getImageSizeClass(1))}
            src={embed.external.thumb}
          />
        ) : undefined}
        <div className="dark:text-gray-300">
          <div>{embed.external.title}</div>
          <div>{embed.external.description}</div>
          <div>
            {/* We don't want links to get out the container since the container usually is dashed bordered */}
            <a
              className="text-gray-500 dark:text-gray-50 break-all"
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
    const recordView = <RecordEmbedView embed={embed} />
    if (recordView) {
      return recordView
    }
  }
  return <span />
}

export function RecordEmbedView({
  embed,
  leftAligned = true,
}: {
  embed: AppBskyEmbedRecord.View | { $type: string; [k: string]: unknown }
  leftAligned?: boolean
}) {
  const leftPadding = !leftAligned ? 'pl-14' : 'pl-2'
  if (
    AppBskyEmbedRecord.isViewRecord(embed.record) &&
    AppBskyFeedPost.isRecord(embed.record.value) &&
    AppBskyFeedPost.validateRecord(embed.record.value).success
  ) {
    return (
      <div
        className={`flex gap-2 pb-2 ${leftPadding} flex-col border-2 border-gray-400 border-dashed my-2 rounded pt-2`}
      >
        <div className="flex flex-row gap-1">
          <ProfileAvatar
            profile={embed.record.author}
            className="w-6 h-6 rounded-full"
          />
          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
            <Link
              href={`/repositories/${embed.record.author.did}`}
              className="hover:underline"
            >
              {embed.record.author.displayName ? (
                <>
                  <span className="font-bold">
                    {embed.record.author.displayName}
                  </span>
                  <span className="ml-1 text-gray-500 dark:text-gray-50">
                    @{embed.record.author.handle}
                  </span>
                </>
              ) : (
                <span className="font-bold">@{embed.record.author.handle}</span>
              )}
            </Link>
            &nbsp;&middot;&nbsp;
            <Link
              href={`/repositories/${embed.record.uri.replace('at://', '')}`}
              className="text-gray-500 dark:text-gray-50 hover:underline"
            >
              {new Date(embed.record.indexedAt).toLocaleString()}
            </Link>
          </p>
        </div>
        <div
          className={`prose-sm ${
            leftAligned ? 'pl-6' : 'pl-10'
          } pb-2 dark:text-gray-100`}
        >
          <RichText post={embed.record.value} />
        </div>
      </div>
    )
  } else if (AppBskyEmbedRecord.isViewBlocked(embed.record)) {
    const { did, collection, rkey } = parseAtUri(embed.record.uri) || {}
    const peekLink = buildBlueSkyAppUrl({
      did: `${did}`,
      rkey: `${rkey}`,
      collection: `${collection?.split('.').pop()}`,
    })
    const repoLink = `/repositories/${did}/${collection}/${rkey}`
    return (
      <div
        className={`flex gap-2 pb-2 ${leftPadding} flex-col border-2 border-gray-400 border-dashed my-2 rounded pt-2`}
      >
        <p className="text-sm font-medium text-gray-600 dark:text-gray-100">
          The author of the original post blocked the author.{' '}
          <Link
            className=" text-gray-900 dark:text-gray-200 underline"
            href={repoLink}
          >
            See quoted post
          </Link>
          {' · '}
          <a
            target="_blank"
            className=" text-gray-900 dark:text-gray-200 underline"
            href={peekLink}
          >
            Peek
          </a>
        </p>
      </div>
    )
  } else if (AppBskyEmbedRecord.isViewNotFound(embed.record)) {
    const { did, collection, rkey } = parseAtUri(embed.record.uri) || {}
    const peekLink = buildBlueSkyAppUrl({
      did: `${did}`,
      rkey: `${rkey}`,
      collection: `${collection?.split('.').pop()}`,
    })
    const repoLink = `/repositories/${did}/${collection}/${rkey}`
    return (
      <div
        className={`flex gap-2 pb-2 ${leftPadding} flex-col border-2 border-gray-400 border-dashed my-2 rounded pt-2`}
      >
        <p className="text-sm font-medium text-gray-600 dark:text-gray-100">
          The embedded record could not be found.{' '}
          <Link
            className=" text-gray-900 dark:text-gray-200 underline"
            href={repoLink}
          >
            See record
          </Link>
          {' · '}
          <a
            target="_blank"
            className=" text-gray-900 dark:text-gray-200 underline"
            href={peekLink}
          >
            Peek
          </a>
        </p>
      </div>
    )
  }
  return null
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
        className="flex flex-col items-center rounded-md px-4 pt-2 pb-1 text-gray-500 dark:text-gray-50 hover:bg-blue-100 hover:text-blue-700 cursor-pointer"
      >
        <DocumentMagnifyingGlassIcon className="w-6 h-6" />
        <span className="text-sm">View</span>
      </Link>
      <button
        type="button"
        className="flex flex-col items-center rounded-md px-4 pt-2 pb-1 text-gray-500 dark:text-gray-50 hover:bg-rose-100 hover:text-rose-700 cursor-pointer"
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
      {labels?.map((label, i) => {
        const { val, src } = label
        return (
          <ModerationLabel
            recordAuthorDid={item.post.author.did}
            label={label}
            className={`${i === 0 ? 'ml-0' : ''}`}
            // there may be multiple labels with the same val for the same cid, where the labeler is different
            // so we need to use the label src is in the key to guaranty uniqueness
            key={`${cid}_${val}_${src}`}
          />
        )
      })}
    </LabelList>
  )
}
