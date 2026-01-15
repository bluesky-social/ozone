import { useQuery } from '@tanstack/react-query'

export interface RecordSnapshot {
  id: number
  cid: string
  value: Record<string, any>
  ozoneValue: Record<string, any>
  createdAt: string
}

export interface SnapshotResponse {
  uri: string
  did: string
  recordPath: string
  total: number
  count: number
  snapshots: RecordSnapshot[]
}

export function useRecordSnapshots(uri: string | undefined) {
  return useQuery({
    retry: false,
    enabled: !!uri,
    queryKey: ['recordSnapshots', { uri }],
    queryFn: async () => {
      if (!uri) {
        throw new Error('URI is required')
      }

      const response = await fetch(
        `/api/get-record-snapshot?uri=${encodeURIComponent(uri)}`,
      )

      if (!response.ok) {
        // Suppress errors - we don't want snapshot failures to break the UI
        return null
      }

      const data: SnapshotResponse = await response.json()
      return data
    },
    // Suppress errors in the query itself
    onError: () => {
      // Silent error handling
    },
  })
}
