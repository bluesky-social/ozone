import { QueueAssigneeStatus } from '@/assignments/QueueAssigneeStatus'
import { useQueueAssignments } from '@/assignments/useAssignments'
import { Card } from '@/common/Card'
import { ModeratorBadge } from '@/common/profileStatus/ModeratorBadge'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { StatValues } from '@/reports/stats/Stats'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import Link from 'next/link'
import { ReactNode } from 'react'

export function QueueCard({
  queue,
  actions,
  hiddenFields,
  hideViewReports,
}: {
  queue: ToolsOzoneQueueDefs.QueueView
  actions?: ReactNode
  hiddenFields?: (keyof ToolsOzoneQueueDefs.QueueView)[]
  hideViewReports?: boolean
}) {
  const { data: assignments } = useQueueAssignments({
    onlyActive: true,
    queueIds: [queue.id],
  })

  return (
    <Card data-cy="queue-card" className="relative px-4 py-3">
      <div className="grid grid-cols-[1fr_1fr_auto] lg:grid-cols-[1fr_1fr_1fr_auto] gap-x-4 items-start text-sm">
        {/* Column 1 */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-medium text-gray-900 dark:text-gray-100 truncate"
              hidden={hiddenFields?.includes('name')}
            >
              <Link
                href={`/reports/beta?queueId=${queue.id}`}
                className="hover:underline"
              >
                {queue.name}
              </Link>
            </h3>
            <span
              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                queue.enabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              } ${hiddenFields?.includes('enabled') ? 'hidden' : ''}`}
            >
              {queue.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p
              className="text-xs text-gray-400 dark:text-gray-500"
              hidden={hiddenFields?.includes('subjectTypes')}
            >
              Subject Types
            </p>
            <div
              className="flex items-center gap-1"
              hidden={hiddenFields?.includes('subjectTypes')}
            >
              {queue.subjectTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
          {!!queue.collection && !hiddenFields?.includes('collection') && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Collection
              </p>
              <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded w-fit">
                {queue.collection}
              </code>
            </div>
          )}
          <div
            className="flex flex-col gap-1"
            hidden={hiddenFields?.includes('reportTypes')}
          >
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Report Types
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {queue.reportTypes.map((type) => (
                <ReasonBadge key={type} reasonType={type} />
              ))}
            </div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col">
          {!hiddenFields?.includes('stats') && (
            <StatValues stats={queue.stats} className="flex-col items-start" />
          )}
          {!hideViewReports && (
            <Link
              href={`/reports/beta?queueId=${queue.id}`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              View Reports &rarr;
            </Link>
          )}
        </div>

        {/* Column 3 */}
        <div className="space-y-2">
          <div
            className="flex flex-col gap-1"
            hidden={hiddenFields?.includes('createdBy')}
          >
            <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              Created By
            </p>
            <ModeratorBadge did={queue.createdBy} />
          </div>
          <div className="w-fit flex flex-col gap-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">Assigned</p>
            <div data-cy="queue-assignees">
              <QueueAssigneeStatus
                queueId={queue.id}
                assignments={assignments ?? []}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions && <div className="w-fit">{actions}</div>}
      </div>
    </Card>
  )
}
