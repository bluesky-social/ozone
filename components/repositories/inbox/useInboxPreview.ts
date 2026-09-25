import { useInfiniteQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  fetchInboxPreviewPage,
  type InboxItem,
  type InboxKind,
  type InboxPage,
  type ReportFilter,
} from './api'

export type { ActionedSubject, InboxReport, SubjectRef } from './api'

export function useInboxPreview<T extends InboxItem>(
  did: string,
  kind: InboxKind,
  filter: ReportFilter = 'all',
) {
  const agent = useLabelerAgent()
  return useInfiniteQuery<InboxPage<T>, Error>({
    queryKey: ['moderatorInboxPreview', kind, did, filter],
    enabled: did.startsWith('did:'),
    queryFn: ({ pageParam, signal }) =>
      fetchInboxPreviewPage<T>(
        agent,
        did,
        kind,
        typeof pageParam === 'string' ? pageParam : undefined,
        signal,
        filter,
      ),
    getNextPageParam: (lastPage) => lastPage.cursor || undefined,
  })
}
