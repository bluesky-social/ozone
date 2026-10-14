import { useInfiniteQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  fetchInboxPreviewPage,
  type InboxKind,
  type ReportFilter,
  type InboxSort,
} from './api'

export type { ActionedSubject, InboxReport, SubjectRef } from './api'

export function useInboxPreview<K extends InboxKind>(
  did: string,
  kind: K,
  filter: ReportFilter = 'all',
  sort: InboxSort = { sortField: 'updatedAt', sortDirection: 'desc' },
) {
  const agent = useLabelerAgent()
  return useInfiniteQuery({
    queryKey: ['moderatorInboxPreview', kind, did, filter, sort],
    enabled: did.startsWith('did:'),
    queryFn: ({ pageParam, signal }) =>
      fetchInboxPreviewPage(
        agent,
        did,
        kind,
        typeof pageParam === 'string' ? pageParam : undefined,
        signal,
        filter,
        sort,
      ),
    getNextPageParam: (lastPage) => lastPage.cursor || undefined,
  })
}
