import type { ToolsOzoneQueueDefs } from '@atproto/api'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueueBreakdown } from './QueueBreakdown'

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  details: vi.fn(),
}))

vi.mock('@/queues/useQueues', () => ({ useQueueById: mocks.lookup }))
vi.mock('./useStatGroupDetails', () => ({
  useStatGroupDetails: mocks.details,
}))

const configured = 'example.report.defs#configured'
const observed = 'example.report.defs#observed'
const dates = {
  startDate: '2026-11-09T00:00:00.000Z',
  endDate: '2026-11-11T00:00:00.000Z',
}
const queue: ToolsOzoneQueueDefs.QueueView = {
  id: 4,
  name: 'Example queue',
  createdBy: 'did:plc:moderator',
  createdAt: dates.startDate,
  updatedAt: dates.endDate,
  enabled: true,
  reportTypes: [configured],
  stats: {},
}
const data = {
  ...dates,
  computedAt: '2026-11-11T12:00:00.000Z',
  reportTypeBreakdown: {
    totalCount: 2,
    stats: [{ reportType: observed, inboundCount: 2 }],
  },
}
const render = (queueId = queue.id) =>
  renderToStaticMarkup(<QueueBreakdown queueId={queueId} {...dates} />)

beforeEach(() => {
  mocks.lookup.mockReset().mockReturnValue({ queue, isLoading: false })
  mocks.details.mockReset().mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })
})

describe('queue breakdown', () => {
  it('looks up the selected queue and combines its configured types with observed reports', () => {
    const markup = render()
    expect(mocks.lookup).toHaveBeenCalledWith(queue.id)
    expect(mocks.details).toHaveBeenCalledWith(
      { queueId: queue.id, ...dates },
      { enabled: true },
    )
    expect(markup).toContain(`title="${configured}"`)
    expect(markup).toContain(`title="${observed}"`)
    expect(markup).toContain('>0</td>')
    expect(markup).toContain('>2</td>')
  })

  it('waits for queue metadata without displaying cached counts', () => {
    mocks.lookup.mockReturnValue({ queue: undefined, isLoading: true })
    const markup = render()
    expect(mocks.details).toHaveBeenCalledWith(
      { queueId: queue.id, ...dates },
      { enabled: false },
    )
    expect(markup).toContain('Loading queue details')
    expect(markup).not.toContain('<table')
  })

  it('keeps the query disabled and hides cached counts for an unavailable queue', () => {
    mocks.lookup.mockReturnValue({ queue: undefined, isLoading: false })
    const markup = render()
    expect(mocks.details).toHaveBeenCalledWith(
      { queueId: queue.id, ...dates },
      { enabled: false },
    )
    expect(markup).toContain('Queue is unavailable')
    expect(markup).not.toContain('<table')
  })

  it('shows observed types for unqueued reports without requiring queue metadata', () => {
    mocks.lookup.mockReturnValue({ queue: undefined, isLoading: false })
    const markup = render(-1)
    expect(mocks.lookup).toHaveBeenCalledWith(null)
    expect(mocks.details).toHaveBeenCalledWith(
      { queueId: -1, ...dates },
      { enabled: true },
    )
    expect(markup).toContain(`title="${observed}"`)
    expect(markup).not.toContain(`title="${configured}"`)
  })

  it('replaces configured types and counts when a different queue is selected', () => {
    expect(render()).toContain(`title="${configured}"`)
    const nextConfigured = 'example.report.defs#nextConfigured'
    const nextObserved = 'example.report.defs#nextObserved'
    mocks.lookup.mockReturnValue({
      queue: { ...queue, id: 5, reportTypes: [nextConfigured] },
      isLoading: false,
    })
    mocks.details.mockReturnValue({
      data: {
        ...data,
        reportTypeBreakdown: {
          totalCount: 3,
          stats: [{ reportType: nextObserved, inboundCount: 3 }],
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    const markup = render(5)
    expect(mocks.details).toHaveBeenLastCalledWith(
      { queueId: 5, ...dates },
      { enabled: true },
    )
    expect(markup).toContain(`title="${nextConfigured}"`)
    expect(markup).toContain(`title="${nextObserved}"`)
    expect(markup).toContain('>3</td>')
    expect(markup).not.toContain(`title="${configured}"`)
    expect(markup).not.toContain(`title="${observed}"`)
  })
})
