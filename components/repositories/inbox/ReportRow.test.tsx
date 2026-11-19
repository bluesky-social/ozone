import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ReportRow } from './InboxPreview'
import type { InboxReport } from './api'

vi.mock('@/shell/ConfigurationContext', () => ({
  useConfigurationContext: () => ({
    labelerAgent: {},
    config: { did: 'did:plc:labeler' },
  }),
  useLabelerAgent: () => ({}),
}))
vi.mock('@/shell/AuthContext', () => ({ usePdsAgent: () => ({}) }))

it('shows current subject statuses only in report details', () => {
  const did = 'did:plc:reporter'
  const item: InboxReport = {
    src: 'did:plc:labeler',
    id: 101,
    isRead: true,
    reasonType: 'com.atproto.moderation.defs#reasonSpam',
    subject: {
      $type: 'com.atproto.repo.strongRef',
      uri: 'at://did:plc:author/app.bsky.feed.post/123',
      cid: 'bafyreid',
    },
    status: 'pending',
    createdAt: '2026-11-17T21:49:24.436Z',
    updatedAt: '2026-11-17T21:49:24.436Z',
  }
  const client = new QueryClient()
  client.setQueryData(['inboxReportDetail', did, item.id, 'did:plc:labeler'], {
    report: {
      ...item,
      accountStatus: { enforcement: 'takendown' },
      subjectStatus: { removed: false, deleted: true },
    },
  })
  const render = (selected: boolean) =>
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ReportRow item={item} did={did} selected={selected} />
      </QueryClientProvider>,
    )

  expect(render(false)).not.toContain('Account taken down')
  const detail = render(true)
  expect(detail).toContain('Current status')
  expect(detail).toContain('Account taken down')
  expect(detail).toContain('Content deleted')
  expect(detail).toContain('Awaiting review')
  expect(detail).not.toContain('Content removed')
})
