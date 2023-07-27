import Link from 'next/link'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'
import { createAtUri, parseAtUri, truncate } from '@/lib/util'
import { CollectionId } from './helpers/subject'

export function SubjectOverview(props: {
  subject: { did: string } | { uri: string } | Record<string, unknown>
  subjectRepoHandle?: string
  withTruncation?: boolean
}) {
  const { subject, subjectRepoHandle, withTruncation = true } = props
  const summary =
    typeof subject['did'] === 'string'
      ? { did: subject['did'], collection: null, rkey: null }
      : typeof subject['uri'] === 'string'
      ? parseAtUri(subject['uri'])
      : null

  if (!summary) {
    return null
  }

  if (summary.collection) {
    const isProfileCollection = summary.collection === CollectionId.Profile
    const shortCollection = summary.collection.replace('app.bsky.feed.', '')
    const repoText = subjectRepoHandle
      ? `@${subjectRepoHandle}`
      : truncate(summary.did, withTruncation ? 16 : Infinity)

    if (isProfileCollection) {
      return (
        <div className="flex flex-row items-center">
          <Link href={`/repositories/${summary.did}`} target="_blank">
            <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 mr-1" />
          </Link>
          <Link
            href={`/reports?term=${encodeURIComponent(createAtUri(summary))}`}
            className="text-gray-600 hover:text-gray-900 font-medium mr-1"
          >
            profile
          </Link>
          by
          <Link
            href={`/reports?term=${summary.did}`}
            className="ml-1 text-gray-600 hover:text-gray-900 font-medium"
          >
            {repoText}
          </Link>
        </div>
      )
    }

    return (
      <div className="flex flex-row items-center">
        <Link
          href={`/repositories/${createAtUri(summary).replace('at://', '')}`}
          target="_blank"
        >
          <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 mr-1" />
        </Link>
        <Link
          href={`/reports?term=${encodeURIComponent(createAtUri(summary))}`}
          className="text-gray-600 hover:text-gray-900 font-medium mr-1"
        >
          {shortCollection}
        </Link>
        by
        <Link
          href={`/reports?term=${summary.did}`}
          className="ml-1 text-gray-600 hover:text-gray-900 font-medium"
        >
          {repoText}
        </Link>
      </div>
    )
  }

  const repoText = subjectRepoHandle
    ? `@${subjectRepoHandle}`
    : `repo ${truncate(summary.did, withTruncation ? 26 : Infinity)}`

  return (
    <div className="flex flex-row items-center">
      <Link href={`/repositories/${summary.did}`} target="_blank">
        <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 mr-1" />
      </Link>

      <Link
        href={`/reports?term=${summary.did}`}
        className="text-gray-600 hover:text-gray-900 font-medium"
      >
        {repoText}
      </Link>
    </div>
  )
}
