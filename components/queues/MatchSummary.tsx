import { ReasonBadge } from '@/reports/ReasonBadge'
import type { ToolsOzoneQueueDefs } from '@atproto/api'

type MatchingCriteria = Pick<
  ToolsOzoneQueueDefs.QueueView,
  'subjectTypes' | 'collection' | 'reportTypes' | 'reporterTags' | 'accountTags'
>

export function matchesAutomatically(queue: MatchingCriteria): boolean {
  return !!(queue.subjectTypes?.length && queue.reportTypes?.length)
}

/**
 * Displays a summary of the matching criteria for a queue, including subject types, report types, and tags.
 */
export function MatchSummary({
  subjectTypes = [],
  collection,
  reportTypes = [],
  reporterTags = [],
  accountTags = [],
}: MatchingCriteria) {
  const automatic = matchesAutomatically({
    subjectTypes,
    reportTypes,
    reporterTags,
    accountTags,
  })
  return (
    <div className="space-y-2 text-sm break-words">
      {!automatic && (
        <p className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-yellow-900 dark:text-yellow-200">
          No reports will match this queue automatically. Reports must be routed
          to this queue explicitly.
        </p>
      )}
      <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-blue-900 dark:text-blue-200 space-y-3">
        <div>
          <span>Report reason: </span>
          {reportTypes.length ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {reportTypes.map((type) => (
                <ReasonBadge key={type} reasonType={type} />
              ))}
            </div>
          ) : (
            <span>None selected.</span>
          )}
        </div>
        <div>
          <span>Subject: </span>
          {subjectTypes.length ? subjectTypes.join(', ') : 'None selected.'}
          {subjectTypes.includes('record') && (
            <p className="mt-1">
              {collection
                ? `Record collection: ${collection}`
                : 'All record collections.'}
            </p>
          )}
        </div>
        {reporterTags.length > 0 && (
          <p>
            Reporter account must have any of these tags:{' '}
            <strong>{reporterTags.join(', ')}</strong>.
          </p>
        )}
        {accountTags.length > 0 && (
          <p>
            Account being reported against must have any of these tags:{' '}
            <strong>{accountTags.join(', ')}</strong>.
          </p>
        )}
        {reporterTags.length > 0 && accountTags.length > 0 && (
          <p>Both tag conditions must match.</p>
        )}
        {automatic && (
          <>
            <p>All configured conditions must match.</p>
            <p>
              Tool destinations take precedence. Otherwise, the lowest matching
              queue ID wins, regardless of tags.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
