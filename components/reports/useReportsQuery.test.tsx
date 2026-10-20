import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReportsQuery } from './useReportsQuery'

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
  queryOptions: vi.fn(),
  queryReports: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.params,
  usePathname: () => '/repositories/did:plc:example/app.bsky.actor.link/link',
}))
vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options) => {
    mocks.queryOptions(options)
    return {}
  },
}))
vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: () => ({
    tools: { ozone: { report: { queryReports: mocks.queryReports } } },
  }),
}))
vi.mock('./useReports', () => ({ persistReportListIds: vi.fn() }))

const uri = 'at://did:plc:example/app.bsky.actor.link/link'

function renderQuery(scope?: Parameters<typeof useReportsQuery>[0]) {
  function Harness() {
    useReportsQuery(scope)
    return null
  }
  renderToStaticMarkup(<Harness />)
  return mocks.queryOptions.mock.lastCall![0]
}

beforeEach(() => {
  mocks.params = new URLSearchParams()
  mocks.queryOptions.mockClear()
  mocks.queryReports.mockReset().mockResolvedValue({
    data: { reports: [], cursor: 'next-page' },
  })
})

describe('reports received query scope', () => {
  it('pins record reports to the record URI across filters and pagination', async () => {
    mocks.params = new URLSearchParams({
      term: 'subject:at://did:plc:other/app.bsky.feed.post/post',
      subjectType: 'account',
      collections: 'app.bsky.feed.post',
      status: 'closed',
      sortField: 'updatedAt',
      sortDirection: 'desc',
      mute: 'all',
      queueId: '4',
      assignedTo: 'did:plc:moderator',
      reportTypes: 'tools.ozone.report.defs#reasonOther',
    })
    const query = renderQuery({ subject: uri })
    const result = await query.queryFn({ pageParam: 'previous-page' })
    expect(mocks.queryReports).toHaveBeenCalledWith({
      limit: 100,
      cursor: 'previous-page',
      did: undefined,
      subject: uri,
      status: 'closed',
      sortField: 'updatedAt',
      sortDirection: 'desc',
      queueId: 4,
      assignedTo: 'did:plc:moderator',
      reportTypes: ['tools.ozone.report.defs#reasonOther'],
    })
    expect(query.queryKey[1]).toMatchObject({ subject: uri, did: undefined })
    expect(query.getNextPageParam(result)).toBe('next-page')
  })

  it('keeps profile reports scoped to the account and its records', async () => {
    mocks.params.set('term', `subject:${uri}`)
    const query = renderQuery({ did: 'did:plc:example' })
    await query.queryFn({})
    expect(mocks.queryReports).toHaveBeenCalledWith(
      expect.objectContaining({ did: 'did:plc:example', isMuted: false }),
    )
    expect(mocks.queryReports.mock.lastCall![0]).not.toHaveProperty('subject')
    expect(query.queryKey[1]).toMatchObject({
      did: 'did:plc:example',
      subject: undefined,
    })
  })

  it('retains subject search on the global report list', async () => {
    mocks.params.set('term', `subject:${uri}`)
    const query = renderQuery()
    await query.queryFn({})
    expect(mocks.queryReports).toHaveBeenCalledWith(
      expect.objectContaining({ subject: uri, did: undefined }),
    )
  })

  it('uses separate cache entries for different record URIs', () => {
    const first = renderQuery({ subject: uri }).queryKey
    const second = renderQuery({ subject: uri + '2' }).queryKey
    expect(first).not.toEqual(second)
  })
})
