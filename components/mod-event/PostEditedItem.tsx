import Link from 'next/link'
import { ComAtprotoRepoStrongRef } from '@atproto/api'
import { Card } from '@/common/Card'
import {
  getChangedFields,
  VersionContent,
} from '@/common/postVersions/VersionContent'
import { formatEditDelay } from '@/common/postVersions/util'
import { getVersionLabel, PostVersion } from '@/lib/postVersions'
import { classNames } from '@/lib/util'
import { ModEventViewWithDetails } from './useModEventList'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/**
 * A "Post edited" entry in a post's moderation history. It is not a
 * moderation event: it comes from the post's versions, and is placed in the
 * timeline at the time of the edit.
 */
export function PostEditedItem({
  uri,
  version,
  previous,
}: {
  uri: string
  version: PostVersion
  previous: PostVersion
}) {
  const editedAt = version.editedAt ?? version.indexedAt
  const changed = getChangedFields(version, previous)
  const delay = formatEditDelay(version)

  return (
    <div className="mt-4">
      <div className="text-gray-500 dark:text-gray-50 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p>
          <span className="text-yellow-500">Post edited</span>
          <i>
            {' '}
            at{' '}
            <time dateTime={editedAt}>
              {dateFormatter.format(new Date(editedAt))}
            </time>
          </i>
        </p>
        <span className="text-xs">By the author</span>
      </div>
      <Card>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-300">
          Changed {changed.length ? changed.join(' and ') : 'nothing visible'}
          {delay ? `, ${delay}` : ''}.
        </p>
        <VersionContent version={version} previous={previous} />
        <Link
          href={`/repositories/${uri.replace('at://', '')}?tab=versions`}
          className="mt-2 inline-block text-xs text-gray-500 underline dark:text-gray-300"
        >
          View all versions
        </Link>
      </Card>
    </div>
  )
}

/**
 * Small tag on an event's title row saying which version of an edited post
 * the event was made against.
 */
export function EventVersionChip({
  modEvent,
  versions,
}: {
  modEvent: ModEventViewWithDetails
  versions: PostVersion[]
}) {
  if (!ComAtprotoRepoStrongRef.isMain(modEvent.subject)) return null
  const cid = modEvent.subject.cid
  const index = versions.findIndex((v) => v.cid === cid)
  if (index === -1) return null
  const isCurrent = index === versions.length - 1
  const label = isCurrent
    ? 'Current version'
    : `${getVersionLabel(versions, index)} version`

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        isCurrent
          ? 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200'
          : 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200',
      )}
      title={`CID ${cid}`}
    >
      {label}
    </span>
  )
}

type TimelineItem =
  | { kind: 'event'; time: string; modEvent: ModEventViewWithDetails }
  | {
      kind: 'edit'
      time: string
      version: PostVersion
      previous: PostVersion
    }

/**
 * Merges post edits into a page of moderation events, keeping the events'
 * sort order. While more events can still load, edits older than the last
 * loaded event are left out so they don't jump around as pages arrive.
 */
export function mergePostEdits(
  modEvents: ModEventViewWithDetails[],
  versions: PostVersion[] | undefined,
  hasMoreEvents: boolean,
): TimelineItem[] {
  const items: TimelineItem[] = modEvents.map((modEvent) => ({
    kind: 'event',
    time: modEvent.createdAt,
    modEvent,
  }))
  if (!versions || versions.length < 2) return items

  const first = modEvents[0]?.createdAt
  const last = modEvents.at(-1)?.createdAt
  const newestFirst = !first || !last || first >= last

  for (let i = 1; i < versions.length; i++) {
    const version = versions[i]
    const time = version.editedAt ?? version.indexedAt
    if (hasMoreEvents && last) {
      const isLoaded = newestFirst ? time >= last : time <= last
      if (!isLoaded) continue
    }
    items.push({ kind: 'edit', time, version, previous: versions[i - 1] })
  }

  return items
    .map((item, order) => ({ item, order }))
    .sort((a, b) => {
      const byTime = newestFirst
        ? b.item.time.localeCompare(a.item.time)
        : a.item.time.localeCompare(b.item.time)
      return byTime || a.order - b.order
    })
    .map(({ item }) => item)
}
