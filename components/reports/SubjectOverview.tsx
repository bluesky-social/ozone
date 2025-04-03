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
  omitQueryParams,
}: {
  did: string
  repoText: string
  className?: string
  omitQueryParams?: string[]
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const newUrl = new URLSearchParams(searchParams)
  newUrl.set('quickOpen', did)
  if (omitQueryParams?.length) {
    omitQueryParams.forEach((param) => newUrl.delete(param))
  }
  return (
    <Link
      prefetch={false}
      href={{ pathname, search: newUrl.toString() }}
      className={classNames(
        'text-gray-600 hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-200 font-medium',
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
  omitQueryParams,
}: {
  uri: string
  collectionName: string
  repoUrl: string
  omitQueryParams?: string[]
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const newUrl = new URLSearchParams(searchParams)
  newUrl.set('quickOpen', uri)
  if (omitQueryParams?.length) {
    omitQueryParams.forEach((param) => newUrl.delete(param))
  }

  return (
    <>
      <Link href={`/repositories/${repoUrl}`} target="_blank" prefetch={false}>
        <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 mr-1" />
      </Link>
      <Link
        prefetch={false}
        href={{ pathname, search: newUrl.toString() }}
        className="text-gray-600 hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-300 font-medium mr-1"
      >
        {collectionName}
      </Link>
    </>
  )
}

export function SubjectOverview(props: {
  subject: { did: string } | { uri: string } | Record<string, unknown>
  omitQueryParamsInLinks?: string[]
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
            omitQueryParams={props.omitQueryParamsInLinks}
          />
          {!hideActor && (
            <>
              by
              <OtherReportsForAuthorLink
                did={summary.did}
                repoText={repoText}
                className="ml-1"
                omitQueryParams={props.omitQueryParamsInLinks}
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
            omitQueryParams={props.omitQueryParamsInLinks}
          />
          {!hideActor && (
            <>
              by
              <OtherReportsForAuthorLink
                did={summary.did}
                repoText={repoText}
                className="ml-1"
                omitQueryParams={props.omitQueryParamsInLinks}
              />
            </>
          )}
        </div>
      )
    }

    if (summary.collection === CollectionId.StarterPack) {
      return (
        <div className="flex flex-row items-center">
          <CollectionLink
            repoUrl={createAtUri(summary).replace('at://', '')}
            uri={createAtUri(summary)}
            collectionName="starterpack"
            omitQueryParams={props.omitQueryParamsInLinks}
          />
          {!hideActor && (
            <>
              by
              <OtherReportsForAuthorLink
                did={summary.did}
                repoText={repoText}
                className="ml-1"
                omitQueryParams={props.omitQueryParamsInLinks}
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
            omitQueryParams={props.omitQueryParamsInLinks}
          />
          {!hideActor && (
            <>
              by
              <OtherReportsForAuthorLink
                did={summary.did}
                repoText={repoText}
                className="ml-1"
                omitQueryParams={props.omitQueryParamsInLinks}
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
          omitQueryParams={props.omitQueryParamsInLinks}
        />
        {!hideActor && (
          <>
            by
            <OtherReportsForAuthorLink
              did={summary.did}
              repoText={repoText}
              className="ml-1"
              omitQueryParams={props.omitQueryParamsInLinks}
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
      <Link
        href={`/repositories/${summary.did}`}
        prefetch={false}
        target="_blank"
      >
        <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 mr-1" />
      </Link>

      <OtherReportsForAuthorLink
        did={summary.did}
        repoText={repoText}
        omitQueryParams={props.omitQueryParamsInLinks}
      />
    </div>
  )
}
