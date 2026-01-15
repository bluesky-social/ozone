'use client'
import {
  AppBskyEmbedExternal,
  asPredicate,
  AppBskyActorStatus,
  $Typed,
} from '@atproto/api'
import { EmbedRenderer } from '../posts/PostsFeed'
import { useBlobUrl } from '../BlobListLightbox'

// @TODO: cleanup
const isValidEmbed = (
  embed: AppBskyActorStatus.Main['embed'],
): embed is $Typed<AppBskyEmbedExternal.Main> => {
  const validation = AppBskyEmbedExternal.validateMain(embed)
  return true
}

export function ProfileStatusCard({
  value,
  authorDid,
}: {
  value: AppBskyActorStatus.Main
  authorDid: string
}) {
  const getBlobUrl = useBlobUrl({ authorDid })
  const isLive = value.status === 'app.bsky.actor.status#live'
  const createdAt = new Date(value.createdAt)
  const expiresAt = value.durationMinutes
    ? new Date(createdAt.getTime() + value.durationMinutes * 60000)
    : null

  return (
    <div className="bg-white dark:bg-slate-800 p-2">
      <div className="flex  items-center gap-2 mb-1">
        {isLive && (
          <span className="inline-flex items-center px-2 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse" />
            Stream
          </span>
        )}
        {value.durationMinutes && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            <span>
              Duration: {value.durationMinutes} minute
              {value.durationMinutes !== 1 ? 's' : ''}
              {expiresAt && (
                <span className="ml-1 text-gray-500 dark:text-gray-400">
                  (expires {expiresAt.toLocaleString()})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {isValidEmbed(value.embed) && (
        <div className="mt-3 -ml-14">
          <EmbedRenderer
            embed={{
              $type: 'app.bsky.embed.external#view',
              external: {
                uri: value.embed.external.uri,
                title: value.embed.external.title,
                description: value.embed.external.description,
                thumb: value.embed.external.thumb
                  ? getBlobUrl({
                      cid: value.embed.external.thumb.ref.toString(),
                    })
                  : undefined,
              },
            }}
            mediaFilters={{ blur: false, grayscale: false, translucent: false }}
          />
        </div>
      )}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        First went live: {createdAt.toLocaleString()}
      </div>
    </div>
  )
}
