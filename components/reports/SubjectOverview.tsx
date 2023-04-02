import Link from 'next/link'
import { ComAtprotoRepoStrongRef, ComAtprotoAdminDefs } from '@atproto/api'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'
import { Report } from '../../lib/types'
import { createAtUri, parseAtUri, truncate } from '../../lib/util'

export function SubjectOverview(props: {
  subject: Report['subject']
  withTruncation?: boolean
}) {
  const { subject, withTruncation = true } = props
  const summary = ComAtprotoAdminDefs.isRepoRef(subject)
    ? { did: subject.did, collection: null, rkey: null }
    : ComAtprotoRepoStrongRef.isMain(subject)
    ? parseAtUri(subject.uri)
    : null
  if (!summary) {
    return null
  }
  if (summary.collection) {
    const shortCollection = summary.collection.replace('app.bsky.feed.', '')
    return (
      <>
        <Link
          href={`/repositories/${createAtUri(summary).replace('at://', '')}`}
          target="_blank"
        >
          <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 mr-1" />
        </Link>
        <Link
          href={`/reports?term=${encodeURIComponent(createAtUri(summary))}`}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          {shortCollection} record
        </Link>{' '}
        by{' '}
        <Link
          href={`/reports?term=${summary.did}`}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          {truncate(summary.did, withTruncation ? 16 : Infinity)}
        </Link>
      </>
    )
  }
  return (
    <>
      <Link href={`/repositories/${summary.did}`} target="_blank">
        <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 mr-1" />
      </Link>
      <Link
        href={`/reports?term=${summary.did}`}
        className="text-gray-600 hover:text-gray-900 font-medium"
      >
        repo {truncate(summary.did, withTruncation ? 26 : Infinity)}
      </Link>
    </>
  )
}
