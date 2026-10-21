'use client'

import { useQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { fetchAccountStatus, fetchUnreadCounts } from './api'
import { date, standingLabel } from './presentation'

export function InboxSummary({ did }: { did: string }) {
  const agent = useLabelerAgent()
  const enabled = did.startsWith('did:')
  const standing = useQuery({
    queryKey: ['inboxAccountStatus', did],
    enabled,
    queryFn: ({ signal }) => fetchAccountStatus(agent, did, signal),
  })
  const unread = useQuery({
    queryKey: ['inboxUnreadCounts', did],
    enabled,
    queryFn: ({ signal }) => fetchUnreadCounts(agent, did, signal),
  })
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      <section className="rounded-lg border border-gray-200 bg-white p-4 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Account standing
        </h3>
        {standing.data ? (
          <>
            <p
              className={`mt-1 text-lg font-semibold ${standing.data.standing === 'atRisk' ? 'text-red-600 dark:text-red-400' : standing.data.standing === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}
            >
              {standingLabel(standing.data.standing)}
            </p>
            {Date.parse(standing.data.updatedAt) > 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Latest account activity {date(standing.data.updatedAt, true)}
              </p>
            )}
            {standing.data.expiresAt && (
              <p className="mt-1 text-sm">
                Suspension expires {date(standing.data.expiresAt, true)}
              </p>
            )}
          </>
        ) : (
          <p
            className="mt-1 text-sm"
            role={standing.isError ? 'alert' : undefined}
          >
            {standing.isError
              ? 'Account standing unavailable.'
              : 'Loading account standing…'}
          </p>
        )}
      </section>
      <section className="rounded-lg border border-gray-200 bg-white p-4 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Unread notifications
        </h3>
        {unread.data ? (
          <>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {unread.data.total}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Reports {unread.data.reports ?? 0} · Subjects{' '}
              {unread.data.subjects ?? 0} · Account standing{' '}
              {unread.data.accountStatus ?? 0}
            </p>
          </>
        ) : (
          <p
            className="mt-1 text-sm"
            role={unread.isError ? 'alert' : undefined}
          >
            {unread.isError
              ? 'Unread notification counts unavailable.'
              : 'Loading unread counts…'}
          </p>
        )}
      </section>
    </div>
  )
}
