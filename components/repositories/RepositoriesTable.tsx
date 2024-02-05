import Link from 'next/link'
import { UserGroupIcon } from '@heroicons/react/20/solid'
import { formatDistanceToNow } from 'date-fns'
import { AppBskyActorProfile } from '@atproto/api'
import { Repo } from '@/lib/types'
import { LoadMoreButton } from '../common/LoadMoreButton'
import { ReviewStateIcon } from '@/subject/ReviewStateMarker'

export function RepositoriesTable(props: {
  repos: Repo[]
  showLoadMore: boolean
  showEmptySearch: boolean
  onLoadMore: () => void
}) {
  const { repos, showLoadMore, onLoadMore, showEmptySearch } = props
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="-mx-4 mt-8 overflow-hidden border border-gray-300 sm:-mx-6 md:mx-0 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-white dark:bg-slate-800">
            <RepoRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-800">
            {!!repos?.length ? (
              repos.map((repo) => <RepoRow key={repo.did} repo={repo} />)
            ) : (
              <tr>
                <td colSpan={4}>
                  <div className="flex flex-col items-center py-10">
                    <UserGroupIcon className="h-10 w-10" />
                    <p className="text-gray-500 dark:text-gray-50 text-base">
                      {showEmptySearch
                        ? `Please insert a full or partial handle in the search box above to see matching repositories`
                        : `No repositories found!`}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showLoadMore && (
        <div className="flex justify-center py-6">
          <LoadMoreButton onClick={onLoadMore} />
        </div>
      )}
    </div>
  )
}

function RepoRow(props: { repo: Repo }) {
  const { repo, ...others } = props
  const profile = repo.relatedRecords.find(AppBskyActorProfile.isRecord)
  const displayName = profile?.displayName
  const indexedAt = new Date(repo.indexedAt)
  const { subjectStatus } = repo.moderation
  return (
    <tr {...others}>
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6">
        <Link
          href={`/repositories/${repo.handle}`}
          className="text-indigo-600 hover:text-indigo-900 dark:text-teal-400 dark:hover:text-teal-600"
        >
          {repo.handle}
        </Link>
        <dl className="font-normal lg:hidden">
          <dt className="sr-only">Name</dt>
          <dd className="mt-1 truncate text-gray-700 dark:text-gray-100">{displayName}</dd>
          <dt className="sr-only sm:hidden">Type</dt>
        </dl>
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-50 lg:table-cell">
        {displayName}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-50 lg:table-cell">
        <span title={indexedAt.toLocaleString()}>
          {formatDistanceToNow(indexedAt, { addSuffix: true })}
        </span>
      </td>
      <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        {subjectStatus && (
          <ReviewStateIcon
            subjectStatus={subjectStatus}
            className="h-5 w-5 inline-block align-bottom"
          />
        )}
      </td>
    </tr>
  )
}

function RepoRowHead() {
  return (
    <tr>
      <th
        scope="col"
        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6"
      >
        Handle
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 lg:table-cell"
      >
        Name
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 lg:table-cell"
      >
        Indexed
      </th>
      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
        <span className="sr-only">Moderation</span>
      </th>
    </tr>
  )
}
