import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ActionedRow } from './InboxPreview'
import type { ActionedSubject } from './api'

vi.mock('@/shell/ConfigurationContext', () => ({
  useConfigurationContext: () => ({
    labelerAgent: {},
    config: { did: 'did:plc:labeler' },
  }),
  useLabelerAgent: () => ({}),
}))
vi.mock('@/shell/AuthContext', () => ({ usePdsAgent: () => ({}) }))

it('shows one subject row and the full appeal status and actions in its details', () => {
  const did = 'did:plc:owner'
  const email = {
    id: 2,
    type: 'communicationSent',
    createdAt: '2026-01-02T00:00:00Z',
  }
  const takedown = {
    id: 1,
    type: 'accountTakedown',
    createdAt: '2026-01-01T00:00:00Z',
  }
  const item: ActionedSubject = {
    src: 'did:plc:labeler',
    subject: { $type: 'com.atproto.admin.defs#repoRef', did },
    enforcement: { state: 'takendown', labels: ['porn'] },
    appeal: { state: 'pending' },
    latestAction: email,
    isRead: false,
    createdAt: takedown.createdAt,
    updatedAt: email.createdAt,
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(['inboxActionDetail', did, did, 'did:plc:labeler'], {
    pages: [
      {
        ...item,
        actions: [email, takedown],
        appeal: { state: 'pending' },
        cursor: 'older',
        account: {
          handle: 'user.test',
          profile: { $type: 'app.bsky.actor.profile', displayName: 'User' },
        },
      },
    ],
    pageParams: [undefined],
  })
  const render = (selected: boolean) =>
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ActionedRow item={item} did={did} selected={selected} />
      </QueryClientProvider>,
    )
  const list = render(false)
  expect(list.match(/<article/g)).toHaveLength(1)
  expect(list).toContain('Your account is suspended')
  expect(list).toContain('Appeal under review')
  expect(list).not.toContain('An email was sent about your account')
  expect(list).not.toContain('Load older actions')

  const detail = render(true)
  expect(detail).toContain('Appeal under review')
  expect(detail).toContain(
    'Your appeal has been submitted and is awaiting review.',
  )
  expect(detail).toContain('An email was sent about your account')
  expect(detail).toContain('Your account was suspended')
  expect(detail).toContain('Load older actions')
  expect(detail).toContain('User')
  expect(detail).toContain('@user.test')
  expect(detail).not.toContain('Label: Adult Content')
  const timeline = detail.split('>Timeline</h3>')[1].split('</section>')[0]
  expect(timeline).not.toMatch(/2026|Jan 1|Jan 2/)

  const staleAppeal = {
    ...item,
    latestAction: takedown,
    appeal: {
      state: 'resolved',
      outcome: 'approved',
      resolvedAt: '2025-12-31T00:00:00Z',
    },
  }
  const freshClient = new QueryClient()
  const laterRow = renderToStaticMarkup(
    <QueryClientProvider client={freshClient}>
      <ActionedRow item={staleAppeal} did={did} />
    </QueryClientProvider>,
  )
  expect(laterRow).not.toContain('Appeal approved')

  const afterEmail = {
    ...item,
    appeal: {
      state: 'resolved',
      outcome: 'denied',
      resolvedAt: '2026-01-01T12:00:00Z',
    },
  }
  const emailRow = renderToStaticMarkup(
    <QueryClientProvider client={freshClient}>
      <ActionedRow item={afterEmail} did={did} />
    </QueryClientProvider>,
  )
  expect(emailRow).toContain('Previous appeal denied')
})
