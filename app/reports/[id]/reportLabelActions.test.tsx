import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MOD_EVENTS } from '@/mod-event/constants'
import type { ToolsOzoneReportDefs } from '@atproto/api'
import type { QuickActionProps } from 'app/actions/ModActionPanel/useQuickAction'
import { ReportDetailLayout } from './page-content'

const mocks = vi.hoisted(() => ({
  onSubmit: vi.fn(),
  wrappedSubmit: undefined as QuickActionProps['onSubmit'] | undefined,
  submitMessageStrikeEmail: undefined as QuickActionProps['onSubmitMessageStrikeEmail'],
  closeReport: vi.fn(),
  getEvent: vi.fn(),
}))

// Only exercise the report action handler, not the visual components.
vi.mock('@/common/video/TimestampContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/common/video/TimestampContext')>()),
  VideoTimestampProvider: () => null,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))
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
  useCreateActivity: () => ({ mutateAsync: mocks.closeReport }),
}))
vi.mock('app/actions/ModActionPanel/useQuickAction', () => ({
  useQuickAction: (props: QuickActionProps) => {
    mocks.wrappedSubmit = props.onSubmit
    mocks.submitMessageStrikeEmail = props.onSubmitMessageStrikeEmail
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

function capture(
  reportType: string,
  reportSubject = uri,
  actions?: ToolsOzoneReportDefs.ReportView['actions'],
) {
  renderToStaticMarkup(createElement(ReportDetailLayout, {
    report: {
      id: 42,
      status: 'open',
      reportType,
      eventId: 100,
      reportedBy: 'did:plc:reporter',
      subject: {
        type: reportSubject === uri ? 'record' : 'message',
        subject: reportSubject,
        status: { subject },
      },
      actions,
    } as any,
    subject: reportSubject,
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
  mocks.closeReport.mockReset().mockResolvedValue(undefined)
})

describe('strikes on message reports', () => {
  const message = 'at://did:plc:alice/chat.bsky.convo.message/message'
  const reportType = 'com.atproto.moderation.defs#reasonSpam'
  const email = {
    subject: { $type: 'com.atproto.admin.defs#repoRef', did: 'did:plc:alice' },
    createdBy: 'did:plc:moderator',
    event: { $type: MOD_EVENTS.EMAIL, content: 'Notice', strikeCount: 2 },
  }

  it('links the email to the report before closing it', async () => {
    capture(reportType, message)
    await mocks.submitMessageStrikeEmail!(email)
    expect(mocks.onSubmit).toHaveBeenCalledTimes(1)
    expect(mocks.onSubmit).toHaveBeenCalledWith({
      ...email,
      reportAction: { ids: [42] },
    })
    expect(mocks.closeReport).toHaveBeenCalledWith({
      reportId: 42,
      activity: { $type: 'tools.ozone.report.defs#closeActivity' },
      internalNote: 'Strikes applied via email action #123.',
    })
    expect(mocks.closeReport.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.onSubmit.mock.invocationCallOrder[0],
    )
  })

  it('keeps the report open when Ozone does not confirm the email action', async () => {
    mocks.onSubmit.mockResolvedValue(undefined)
    capture(reportType, message)
    await expect(mocks.submitMessageStrikeEmail!(email)).rejects.toThrow(
      'Ozone did not confirm',
    )
    expect(mocks.closeReport).not.toHaveBeenCalled()
  })

  it('retries report closure without applying strikes again when the email is recorded', async () => {
    mocks.closeReport.mockRejectedValueOnce(new Error('Connection lost'))
    capture(reportType, message)
    await expect(mocks.submitMessageStrikeEmail!(email)).rejects.toThrow(
      'Connection lost',
    )

    capture(reportType, message, [
      { ...email, id: 123, createdAt: '2026-11-27T10:00:00Z', subjectBlobCids: [] },
    ])
    await mocks.submitMessageStrikeEmail!(email)
    expect(mocks.onSubmit).toHaveBeenCalledTimes(1)
    expect(mocks.closeReport).toHaveBeenCalledTimes(2)
  })
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
