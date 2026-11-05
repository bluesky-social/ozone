import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { AccountActionRows } from './InboxPreview'
import type { ActionedSubject } from './api'

vi.mock('@/shell/ConfigurationContext', () => ({
  useConfigurationContext: () => ({
    labelerAgent: {},
    config: { did: 'did:plc:labeler' },
  }),
  useLabelerAgent: () => ({}),
}))
vi.mock('@/shell/AuthContext', () => ({ usePdsAgent: () => ({}) }))

it('shows separate account actions and the selected notice’s profile fallback', () => {
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
  const removedLabel = {
    id: 3,
    type: 'labelRemoved',
    createdAt: '2025-12-31T00:00:00Z',
  }
  const item: ActionedSubject = {
    src: 'did:plc:labeler',
    subject: { $type: 'com.atproto.admin.defs#repoRef', did },
    enforcement: { state: 'takendown', labels: ['porn'] },
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
        actions: [email, takedown, removedLabel],
        appeal: { state: 'pending' },
        account: {
          handle: 'user.test',
          profile: { $type: 'app.bsky.actor.profile', displayName: 'User' },
        },
      },
    ],
    pageParams: [undefined],
  })
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AccountActionRows item={item} did={did} selected selectedActionId={1} />
    </QueryClientProvider>,
  )
  expect(html.match(/<article/g)).toHaveLength(3)
  expect(html).toContain('An email was sent about your account')
  expect(html).toContain('Your account was suspended')
  expect(html).toContain('Limited profile')
  expect(html).toContain('User')
  expect(html).toContain('@user.test')
  expect(html).not.toContain('Label: Adult Content')

  client.setQueryData(['inboxAccountProfile', did], {
    handle: 'current.test',
    displayName: 'Current name',
  })
  const currentHtml = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AccountActionRows item={item} did={did} selected />
    </QueryClientProvider>,
  )
  expect(currentHtml).toContain('Appeal under review')
  expect(currentHtml).toContain('Current name')
  expect(currentHtml).toContain('@current.test')
})
