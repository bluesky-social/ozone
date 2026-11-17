import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MOD_EVENTS } from '@/mod-event/constants'
import type { QuickActionProps } from 'app/actions/ModActionPanel/useQuickAction'
import { ReportDetailLayout } from './page-content'

const mocks = vi.hoisted(() => ({
  onSubmit: vi.fn(),
  wrappedSubmit: undefined as QuickActionProps['onSubmit'] | undefined,
  getEvent: vi.fn(),
}))

// Only exercise the report action handler, not the visual components.
vi.mock('@/common/video/TimestampContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/common/video/TimestampContext')>()),
  VideoTimestampProvider: () => null,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: () => ({
    did: 'did:plc:labeler',
    tools: { ozone: { moderation: { getEvent: mocks.getEvent } } },
  }),
}))
vi.mock('@/reports/helpers/subject', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/reports/helpers/subject')>()),
  useCreateSubjectFromId: () => vi.fn(),
}))
vi.mock('@/reports/useReports', () => ({
  useReportArrowKeyNavigation: () => {},
  useReportAutoAdvance: () => {},
}))
vi.mock('components/reports/hooks', () => ({
  useCreateActivity: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('app/actions/ModActionPanel/useQuickAction', () => ({
  useQuickAction: (props: QuickActionProps) => {
    mocks.wrappedSubmit = props.onSubmit
    return {
      submission: { isSubmitting: false, error: '' },
      currentLabels: [],
      allLabels: [],
      config: { did: 'did:plc:labeler' },
      modEventType: MOD_EVENTS.LABEL,
    }
  },
}))

const uri = 'at://did:plc:alice/app.bsky.feed.post/example'
const subject = { $type: 'com.atproto.repo.strongRef', uri, cid: 'current' }
const event = (cid: string, create: string[], negate: string[]) => ({
  subject: { ...subject, cid },
  createdBy: 'did:plc:moderator',
  event: { $type: MOD_EVENTS.LABEL, createLabelVals: create, negateLabelVals: negate },
})

function capture(reportType: string) {
  renderToStaticMarkup(createElement(ReportDetailLayout, {
    report: {
      id: 42,
      status: 'open',
      reportType,
      eventId: 100,
      reportedBy: 'did:plc:reporter',
      subject: { type: 'record', subject: uri, status: { subject } },
    } as any,
    subject: uri,
    setSubject: vi.fn(),
    onSubmit: mocks.onSubmit,
    onCancel: vi.fn(),
    viewers: [],
  }))
  return mocks.wrappedSubmit!
}

beforeEach(() => {
  mocks.onSubmit.mockReset().mockResolvedValue(123)
  mocks.getEvent.mockReset().mockResolvedValue({ data: { subject: {} } })
})

describe('report label actions', () => {
  it.each([
    'com.atproto.moderation.defs#reasonSpam',
    'com.atproto.moderation.defs#reasonAppeal',
  ])('only closes the report on the final label event for %s', async (reportType) => {
    const submit = capture(reportType)
    const oldCid = event('old', [], ['porn'])
    const currentCid = event('current', ['sexual'], [])
    await submit(oldCid, { supplementalLabelEvent: true })
    expect(mocks.onSubmit).toHaveBeenCalledTimes(1)
    expect(mocks.onSubmit.mock.calls[0][0]).toEqual(oldCid)
    await submit(currentCid)
    expect(mocks.onSubmit.mock.calls[1][0]).toMatchObject({
      ...currentCid,
      reportAction: { ids: [42] },
    })
    if (reportType.endsWith('reasonAppeal')) {
      expect(mocks.onSubmit.mock.calls[2][0]).toMatchObject({
        subject,
        event: { $type: MOD_EVENTS.RESOLVE_APPEAL },
      })
    } else {
      expect(mocks.onSubmit).toHaveBeenCalledTimes(2)
    }
  })
})
