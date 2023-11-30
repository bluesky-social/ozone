import Link from 'next/link'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'
import { classNames, createAtUri, parseAtUri, truncate } from '@/lib/util'
import { CollectionId } from './helpers/subject'
import { usePathname, useSearchParams } from 'next/navigation'

// Renders @handle with link to the repo so that clicking the link can open all reports for that repo's did
const OtherReportsForAuthorLink = ({
  did,
  repoText,
  className,
}: {
  did: string
  repoText: string
  className?: string
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const newUrl = new URLSearchParams(searchParams)
  newUrl.set('quickOpen', did)
  return (
    <Link
      href={{ pathname, search: newUrl.toString() }}
      className={classNames(
        'text-gray-600 hover:text-gray-900 font-medium',
        className,
      )}
    >
      {repoText}
    </Link>
  )
}

// Renders icon link to open details of the report's subject and the name of the collection
// where clicking the collection will open all reports for that at uri
const CollectionLink = ({
  uri,
  collectionName,
  repoUrl,
}: {
  uri: string
  collectionName: string
  repoUrl: string
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const newUrl = new URLSearchParams(searchParams)
  newUrl.set('quickOpen', uri)
  return (
    <>
      <Link href={`/repositories/${repoUrl}`} target="_blank">
        <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 mr-1" />
      </Link>
      <Link
        href={{ pathname, search: newUrl.toString() }}
        className="text-gray-600 hover:text-gray-900 font-medium mr-1"
      >
        {collectionName}
      </Link>
    </>
  )
}

export function SubjectOverview(props: {
  subject: { did: string } | { uri: string } | Record<string, unknown>
  subjectRepoHandle?: string
  withTruncation?: boolean
  hideActor?: boolean
}) {
  const { subject, subjectRepoHandle, withTruncation = true, hideActor } = props
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
    const shortCollection = summary.collection.replace('app.bsky.feed.', '')
    const repoText = subjectRepoHandle
      ? `@${subjectRepoHandle}`
      : truncate(summary.did, withTruncation ? 16 : Infinity)

    if (summary.collection === CollectionId.FeedGenerator) {
      return (
        <div className="flex flex-row items-center">
          <CollectionLink
            repoUrl={createAtUri(summary).replace('at://', '')}
            uri={createAtUri(summary)}
            collectionName="feed generator"
          />
          {!hideActor && (
            <>
              by
              <OtherReportsForAuthorLink
                did={summary.did}
                repoText={repoText}
                className="ml-1"
              />
            </>
          )}
        </div>
      )
    }

    if (summary.collection === CollectionId.List) {
      return (
        <div className="flex flex-row items-center">
          <CollectionLink
            repoUrl={createAtUri(summary).replace('at://', '')}
            uri={createAtUri(summary)}
            collectionName="list"
          />
          {!hideActor && (
            <>
              by
              <OtherReportsForAuthorLink
                did={summary.did}
                repoText={repoText}
                className="ml-1"
              />
            </>
          )}
        </div>
      )
    }

    if (summary.collection === CollectionId.Profile) {
      return (
        <div className="flex flex-row items-center">
          <CollectionLink
            repoUrl={summary.did}
            uri={createAtUri(summary)}
            collectionName="profile"
          />
          {!hideActor && (
            <>
              by
              <OtherReportsForAuthorLink
                did={summary.did}
                repoText={repoText}
                className="ml-1"
              />
            </>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-row items-center">
        <CollectionLink
          repoUrl={createAtUri(summary).replace('at://', '')}
          collectionName={shortCollection}
          uri={createAtUri(summary)}
        />
        {!hideActor && (
          <>
            by
            <OtherReportsForAuthorLink
              did={summary.did}
              repoText={repoText}
              className="ml-1"
            />
          </>
        )}
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

      <OtherReportsForAuthorLink did={summary.did} repoText={repoText} />
    </div>
  )
}
