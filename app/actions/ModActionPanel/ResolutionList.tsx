import { ComAtprotoRepoStrongRef, ComAtprotoAdminDefs } from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { validSubjectString } from '@/lib/types'
import { parseAtUri } from '@/lib/util'
import client from '@/lib/client'
import { ReportItemAccordian } from './ReportItemAccordian'

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
          resolved: false,
          limit: 50,
          cursor: pageParam,
        },
        { headers: client.adminHeaders() },
      )
      return {
        cursor: data.cursor,
        reports: data.reports.filter((report) => {
          return subject === validSubjectString(report.subject)
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
        const summary = ComAtprotoAdminDefs.isRepoRef(report.subject)
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
          <ReportItemAccordian
            name={name}
            key={report.id}
            report={report}
            resolved={resolved}
            shortCollection={shortCollection}
            summary={summary}
          />
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
