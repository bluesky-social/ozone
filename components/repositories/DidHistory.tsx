import { CopyButton } from '@/common/CopyButton'
import { Loading } from '@/common/Loader'
import { PLC_DIRECTORY_URL } from '@/lib/constants'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

// Not a complete mapping of the DID history event, just the parts we care about in the UI
type DidHistoryEvent = {
  cid: string
  createdAt: string
  did: string
  nullified: boolean
  operation: {
    handle?: string
    type: string
    alsoKnownAs?: string[]
  } & (
    | {
        service: string
      }
    | {
        services?: Record<string, Record<string, string>>
      }
  )
}

const getDidPlcWebUrl = (did: string) => `https://web.plc.directory/did/${did}`

export const useDidHistory = (did: string) =>
  useQuery<unknown, unknown, DidHistoryEvent[] | { message: string }>({
    queryKey: ['didHistory', { did }],
    cacheTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!did.startsWith('did:plc')) return null

      const url = `${PLC_DIRECTORY_URL}/${did}/log/audit`
      const res = await fetch(url)
      return res.json()
    },
  })

const getServiceDetails = ({
  operation,
}: {
  operation: DidHistoryEvent['operation']
}): string => {
  if ('service' in operation) {
    return operation.service
  }
  if ('services' in operation) {
    return Object.keys(operation.services || {})
      .map((key) => `${key}(${operation.services?.[key]?.endpoint})`)
      .join(' | ')
  }
  return ''
}

// This function processes the DID history events to extract handle changes over time in plain text where each 
function getHandleChanges(events: DidHistoryEvent[]): string {
  const sortedEvents = events
    .filter((event) => event.operation.handle || event.operation.alsoKnownAs)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

  const changes: string[] = []
  let previousHandle: string | undefined

  for (const event of sortedEvents) {
    const currentHandle =
      event.operation.handle || event.operation.alsoKnownAs?.[0]

    if (currentHandle && currentHandle !== previousHandle) {
      const from = previousHandle || ''
      changes.push(
        !from
          ? `${currentHandle} (${event.createdAt})`
          : `${from} → ${currentHandle} (${event.createdAt})`,
      )
    }

    previousHandle = currentHandle
  }

  return changes.join('\n')
}

export const DidHistory = ({ did }: { did: string }) => {
  const { data: history, isLoading, isError } = useDidHistory(did)

  const plainTextHistory = useMemo(() => {
    if (Array.isArray(history)) {
      return getHandleChanges(history)
    }
    return ''
  }, [history])

  if (history === null) return null
  if (isLoading) return <Loading />
  if (!history) {
    return <h4 className="text-red-500 mb-3">DID History not found!</h4>
  }

  if (isError) {
    return <h4 className="text-red-500 mb-3">Error loading DID history!</h4>
  }

  // Message is set in the response when the response contains an error
  // Not sure why isError is not set in that case though
  if (history && 'message' in history) {
    return <h4 className="text-red-500 mb-3">{history.message}</h4>
  }

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="mb-3">
      <h4 className="font-semibold text-gray-500 dark:text-gray-50">
        DID History{' '}
        <a
          href={getDidPlcWebUrl(did)}
          target="_blank"
          title="Open the web view for this DID record"
        >
          <ArrowTopRightOnSquareIcon className="inline-block h-3 w-3 mr-1" />
        </a>
        <CopyButton
          text={plainTextHistory}
          title={`Copy change history to clipboard`}
          labelText="change history "
        />
      </h4>
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50 dark:bg-slate-700">
          <tr className="text-gray-500 dark:text-gray-50 text-left text-sm">
            <th className="py-2 pl-2">Timestamp</th>
            <th className="py-2 pl-2">Type</th>
            <th className="py-2 pl-2">Handle</th>
            <th className="py-2 pl-2">Service</th>
          </tr>
        </thead>
        <tbody className="dark:text-gray-100">
          {history.map((log) => (
            <tr key={log.cid} className="text-sm align-top">
              <td className="pr-2 py-2 pl-2">
                {dateFormatter.format(new Date(log.createdAt))}
              </td>
              <td className="py-2 pl-2">{log.operation.type}</td>
              <td className="py-2 pl-2">
                {log.operation.handle || log.operation.alsoKnownAs?.[0]}
              </td>
              <td className="py-2 pl-2">
                {getServiceDetails({ operation: log.operation })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
