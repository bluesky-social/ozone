import { Loading } from '@/common/Loader'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useInfiniteQuery } from '@tanstack/react-query'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const useAccountHistory = (did: string) => {
  const labelerAgent = useLabelerAgent()
  return useInfiniteQuery({
    queryKey: ['accountHistory', { did }],
    cacheTime: 1000 * 60 * 5,
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.tools.ozone.hosting.getAccountHistory(
        { did, cursor: pageParam },
      )
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}

const AccountHistoryDetails = ({ details }) => {
  if (
    details.$type === 'tools.ozone.hosting.getAccountHistory#accountCreated'
  ) {
    return (
      <>
        <td>Account Created</td>
        <td>
          {details.email && details.handle
            ? `${details.email} / ${details.handle}`
            : details.email
            ? details.email
            : details.handle
            ? details.handle
            : 'No details available'}
        </td>
      </>
    )
  }

  if (
    details.$type === 'tools.ozone.hosting.getAccountHistory#credentialsRevoked'
  ) {
    return (
      <>
        <td>Credentials Revoked</td>
        <td>Mod Action</td>
      </>
    )
  }

  if (details.$type === 'tools.ozone.hosting.getAccountHistory#emailUpdated') {
    return (
      <>
        <td>Email Updated</td>
        <td>{details.email || 'No email provided'}</td>
      </>
    )
  }

  if (
    details.$type === 'tools.ozone.hosting.getAccountHistory#emailConfirmed'
  ) {
    return (
      <>
        <td>Email Confirmed</td>
        <td>{details.email || 'No email provided'}</td>
      </>
    )
  }

  if (
    details.$type === 'tools.ozone.hosting.getAccountHistory#passwordUpdated'
  ) {
    return (
      <>
        <td>Password Updated</td>
        <td>Password was changed</td>
      </>
    )
  }

  if (details.$type === 'tools.ozone.hosting.getAccountHistory#handleUpdated') {
    return (
      <>
        <td>Handle Updated</td>
        <td>{details.handle || 'No handle provided'}</td>
      </>
    )
  }

  return null
}

export const AccountHistory = ({ did }: { did: string }) => {
  const { data, isLoading, isError, fetchNextPage, hasNextPage } =
    useAccountHistory(did)
  const history = data?.pages.flatMap((page) => page.events) ?? []

  if (isLoading) return <Loading />

  if (!history?.length) {
    return <h4 className="text-red-500 mb-3">No account history found!</h4>
  }

  if (isError) {
    return <h4 className="text-red-500 mb-3">Error loading account history</h4>
  }

  return (
    <div className="mb-3">
      <h4 className="font-semibold text-gray-500 dark:text-gray-50">
        Account History
      </h4>
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50 dark:bg-slate-700">
          <tr className="text-gray-500 dark:text-gray-50 text-left text-sm">
            <th className="py-2 pl-2">Timestamp</th>
            <th className="py-2 pl-2">By</th>
            <th className="py-2 pl-2">Event</th>
            <th className="py-2 pl-2">Details</th>
          </tr>
        </thead>
        <tbody className="dark:text-gray-100">
          {history.map((item) => (
            <tr key={item.createdAt} className="text-sm align-center">
              <td className="px-2 py-2">
                {dateFormatter.format(new Date(item.createdAt))}
              </td>
              <td className="px-2 py-2">
                {item.createdBy === did ? (
                  'User'
                ) : (
                  <a
                    href={`/repositories/${did}`}
                    target="_blank"
                    className="underline"
                  >
                    {did}
                  </a>
                )}
              </td>
              <AccountHistoryDetails details={item.details} />
            </tr>
          ))}
        </tbody>
        {hasNextPage && (
          <tfoot>
            <tr>
              <td colSpan={4} className="py-2 pl-2">
                <div className="flex justify-center mb-4">
                  <LoadMoreButton onClick={() => fetchNextPage()} />
                </div>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
