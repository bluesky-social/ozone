import { ComAtprotoRepoRepoRef, ComAtprotoRepoStrongRef } from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LoadMoreButton } from '../../../components/common/LoadMoreButton'
import { ReasonBadge } from '../../../components/reports/ReasonBadge'
import { validSubjectString } from '../../../lib/types'
import { parseAtUri } from '../../../lib/util'
import client from '../../../lib/client'

export function ResolutionList(props: {
  name?: string
  subject: string | null
}) {
  const { name, subject } = props
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['resolvableReports', { subject }],
    queryFn: async ({ pageParam }) => {
      const subjectDid = subject?.startsWith('at://')
        ? parseAtUri(subject)?.did
        : subject
      if (!subject || !subjectDid) {
        return { reports: [] }
      }
      const { data } = await client.api.com.atproto.admin.getModerationReports(
        {
          subject: subjectDid,
          limit: 25,
          before: pageParam,
        },
        { headers: client.adminHeaders() },
      )
      return {
        cursor: data.cursor,
        reports: data.reports.filter((report) => {
          // Only resolvable reports are for matching did, or exact record.
          const reportSubject = validSubjectString(report.subject)
          if (!reportSubject) return false
          if (
            subject.startsWith('at://') &&
            reportSubject.startsWith('at://')
          ) {
            return subject === reportSubject
          }
          return true
        }),
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const reports = data?.pages.flatMap((page) => page.reports) ?? []
  return (
    <fieldset className="space-y-5 min-w-0">
      {!reports.length && (
        <div className="text-sm text-gray-400">None found</div>
      )}
      {reports.map((report) => {
        const summary = ComAtprotoRepoRepoRef.isMain(report.subject)
          ? { did: report.subject.did, collection: null, rkey: null }
          : ComAtprotoRepoStrongRef.isMain(report.subject)
          ? parseAtUri(report.subject.uri)
          : null
        const shortCollection = summary?.collection?.replace(
          'app.bsky.feed.',
          '',
        )
        const resolved = !!report.resolvedByActionIds.length
        return (
          <div key={report.id} className="relative flex items-start">
            <div className="flex h-5 items-center">
              <input
                id={`report-${report.id}`}
                name={name}
                value={report.id}
                aria-describedby={`report-${report.id}-description`}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor={`report-${report.id}`}
                className="font-medium text-gray-700"
              >
                <span
                  className={`font-bold ${
                    resolved ? 'text-green-500' : 'text-yellow-500'
                  }`}
                >
                  #{report.id}
                </span>{' '}
                {shortCollection &&
                  `${shortCollection} record by ${summary?.did}`}
                {!shortCollection && `repo ${summary?.did}`}
              </label>
              <p
                id={`report-${report.id}-description`}
                className="text-gray-500"
              >
                <ReasonBadge reasonType={report.reasonType} /> {report.reason}
              </p>
            </div>
          </div>
        )
      })}
      {hasNextPage && (
        <div className="flex justify-center">
          <LoadMoreButton
            className="px-0.5 py-0.5"
            onClick={() => fetchNextPage()}
          >
            More
          </LoadMoreButton>
        </div>
      )}
    </fieldset>
  )
}
