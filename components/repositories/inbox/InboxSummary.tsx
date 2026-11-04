'use client'

import { useQuery } from '@tanstack/react-query'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { fetchAccountStatus, fetchUnreadCounts } from './api'
import { accountStatusCopy } from './presentation'

export function InboxSummary({ did }: { did: string }) {
  const { labelerAgent: agent, config } = useConfigurationContext()
  const enabled = did.startsWith('did:')
  const standing = useQuery({
    queryKey: ['inboxAccountStatus', did, config.did],
    enabled,
    queryFn: ({ signal }) => fetchAccountStatus(agent, did, signal),
  })
  const unread = useQuery({
    queryKey: ['inboxUnreadCounts', did, config.did],
    enabled,
    queryFn: ({ signal }) => fetchUnreadCounts(agent, did, signal),
  })
  const copy = standing.data && accountStatusCopy(standing.data)
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      {(!standing.data || copy) && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
          {copy ? (
            <details>
              <summary
                className={`cursor-pointer text-lg font-semibold ${copy.serious ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}
              >
                {copy.title}
              </summary>
              <p className="mt-3 text-sm">{copy.description}</p>
              {copy.expiry && (
                <p className="mt-2 text-sm">
                  Scheduled end:{' '}
                  {new Date(copy.expiry).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
              {copy.disclaimer && (
                <p className="mt-2 text-sm">{copy.disclaimer}</p>
              )}
            </details>
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
      )}
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
