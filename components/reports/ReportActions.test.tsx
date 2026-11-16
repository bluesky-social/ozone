import { AtpAgent, ComAtprotoModerationDefs } from '@atproto/api'
import type { ToolsOzoneReportDefs } from '@atproto/api'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportActionsBar } from './ReportActions'

type Scope = 'current' | 'all' | 'types' | 'allOwned'
const state = vi.hoisted(() => ({
  scope: 'current' as Scope,
  agent: null as AtpAgent | null,
  confirm: undefined as (() => Promise<void>) | undefined,
  success: vi.fn(),
  error: vi.fn(),
}))

// Seed the open confirmation and selected scope in the node-only renderer.
// The submit handler, report mutations, helper, and SDK remain real.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: (initial: unknown) =>
      actual.useState(() => {
        const value = typeof initial === 'function' ? initial() : initial
        if (value === null) return 'no-action'
        if (value === 'current' || value === 'types') return state.scope
        return value
      }),
  }
})
vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: () => state.agent,
  usePermission: () => false,
}))
vi.mock('../custom-actions/Panel', () => ({
  useCustomActionPanel: () => ({ setSelection: vi.fn() }),
  customMenuItems: () => [],
  CustomActionPanel: () => null,
}))
vi.mock('./useReports', () => ({
  useReports: () => ({ nextReportId: null }),
}))
vi.mock('@/common/buttons', () => ({
  ActionButton: (props: ComponentProps<'button'>) => {
    if (props.children === 'Close as no-action') {
      expect(props.disabled).toBe(false)
      state.confirm = props.onClick as () => Promise<void>
    }
    return <button disabled={props.disabled}>{props.children}</button>
  },
}))
vi.mock('@/common/Dropdown', () => ({ Dropdown: () => null }))
vi.mock('@/common/forms', () => ({
  Checkbox: () => null,
  Select: (props: ComponentProps<'select'>) => <select {...props} />,
  Textarea: (props: ComponentProps<'textarea'>) => <textarea {...props} />,
}))
vi.mock('@/common/Loader', () => ({
  displayError: (error: Error) => error.message,
}))
vi.mock('@/common/profileStatus/ModeratorBadge', () => ({
  ModeratorBadge: () => null,
}))
vi.mock('@/lib/util', () => ({ getDidFromUri: () => 'did:plc:subject' }))
vi.mock('@/reports/ReportTypeMultiselect', () => ({
  ReportTypeMultiselect: () => null,
}))
vi.mock('components/email/Composer', () => ({ EmailComposer: () => null }))
vi.mock('components/email/useEmailRecipientStatus', () => ({
  useEmailRecipientStatus: () => ({}),
}))
vi.mock('react-toastify', () => ({
  toast: { success: state.success, error: state.error, info: vi.fn() },
}))

const scopes = [
  { value: 'current', label: 'Close this report only' },
  { value: 'all', label: 'Close all open reports on subject' },
  { value: 'types', label: 'Close reports of specific types' },
  {
    value: 'allOwned',
    label: 'Close reports on this account and all its subjects',
  },
] as const
const bulkScopes = scopes.filter(({ value }) => value !== 'current')
const reportId = 10
const subject = 'did:plc:subject'
const createdAt = '2026-11-01T00:00:00.000Z'
const closeActivity = 'tools.ozone.report.defs#closeActivity'
let client: QueryClient
let requests: { method: string; body: Record<string, unknown> }[]
let currentClosed: boolean
let supportsReportId: boolean
let otherClosedCount: number
let failCurrentClosure: boolean

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function confirmNoAction(
  status = 'assigned',
  overrides: Partial<ToolsOzoneReportDefs.ReportView> = {},
) {
  const report: ToolsOzoneReportDefs.ReportView = {
    id: reportId,
    eventId: 100,
    status,
    subject: { type: 'account', subject },
    reportType: ComAtprotoModerationDefs.REASONSPAM,
    reportedBy: 'did:plc:reporter',
    reporter: { type: 'account', subject: 'did:plc:reporter' },
    createdAt,
    isAutomated: false,
    assignment: { did: 'did:plc:moderator', assignedAt: createdAt },
    ...overrides,
  }
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ReportActionsBar
        report={report}
        currentUserDid="did:plc:moderator"
        selectedAction={null}
        onActionSelect={() => {}}
      />
    </QueryClientProvider>,
  )
  for (const { label } of scopes) expect(html).toContain(label)
  expect(state.confirm).toBeTypeOf('function')
  return state.confirm!()
}

beforeEach(() => {
  state.scope = 'current'
  state.confirm = undefined
  state.success.mockClear()
  state.error.mockClear()
  client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  requests = []
  currentClosed = false
  supportsReportId = true
  otherClosedCount = 1
  failCurrentClosure = false
  state.agent = new AtpAgent({
    service: 'https://labeler.test',
    fetch: async (input, init) => {
      const request = new Request(input, init)
      const method = new URL(request.url).pathname.split('/').pop()!
      const body = JSON.parse(await request.text())
      requests.push({ method, body })

      if (method === 'tools.ozone.report.closeReports') {
        const reportIds = otherClosedCount ? [11] : []
        if (supportsReportId && body.reportId === reportId) {
          if (failCurrentClosure) {
            return response({ error: 'InternalServerError' }, 500)
          }
          currentClosed = true
          reportIds.push(reportId)
        }
        return response({ closedCount: reportIds.length, reportIds })
      }
      if (method === 'tools.ozone.report.createActivity') {
        expect(body.reportId).toBe(reportId)
        expect(body.activity).toEqual({ $type: closeActivity })
        if (failCurrentClosure) {
          return response({ error: 'InternalServerError' }, 500)
        }
        currentClosed = true
        return response({
          activity: {
            id: 1,
            reportId,
            activity: { $type: closeActivity },
            createdBy: 'did:plc:moderator',
            createdAt,
            isAutomated: false,
          },
        })
      }
      throw new Error(`Unexpected request: ${method}`)
    },
  })
})

afterEach(() => {
  client.clear()
  vi.restoreAllMocks()
})

describe.each(['open', 'assigned', 'escalated'])(
  'no-action confirmation for an %s report',
  (status) => {
    it.each(scopes)(
      'closes the current report for "$label"',
      async ({ value }) => {
        state.scope = value
        await confirmNoAction(status)

        expect(currentClosed).toBe(true)
        expect(state.error).not.toHaveBeenCalled()
        expect(requests).toHaveLength(1)
        expect(requests[0]).toEqual({
          method:
            value === 'current'
              ? 'tools.ozone.report.createActivity'
              : 'tools.ozone.report.closeReports',
          body:
            value === 'current'
              ? { reportId, activity: { $type: closeActivity } }
              : {
                  subject,
                  reportId,
                  ...(value === 'types' && {
                    reportTypes: [ComAtprotoModerationDefs.REASONSPAM],
                  }),
                  ...(value === 'allOwned' && { includeAllOwned: true }),
                },
        })
      },
    )
  },
)

it('closes the current report even when its reason is outside the selected types', async () => {
  state.scope = 'types'
  await confirmNoAction('assigned', {
    queue: {
      id: 7,
      name: 'Review',
      reportTypes: [ComAtprotoModerationDefs.REASONRUDE],
      createdBy: 'did:plc:moderator',
      createdAt,
      updatedAt: createdAt,
      enabled: true,
      stats: {},
    },
  })

  expect(currentClosed).toBe(true)
  expect(state.error).not.toHaveBeenCalled()
  expect(requests[0].body).toMatchObject({
    reportId,
    reportTypes: [ComAtprotoModerationDefs.REASONRUDE],
  })
})

describe.each([0, 1])(
  'older backend closes %i other reports',
  (closedCount) => {
    it.each(bulkScopes)(
      'still closes the current report for "$label"',
      async ({ value }) => {
        state.scope = value
        supportsReportId = false
        otherClosedCount = closedCount
        await confirmNoAction()

        expect(currentClosed).toBe(true)
        expect(state.error).not.toHaveBeenCalled()
        expect(state.success).toHaveBeenCalledWith(
          `Closed ${closedCount + 1} ${closedCount ? 'reports' : 'report'} as no-action`,
        )
        expect(requests.map(({ method }) => method)).toEqual([
          'tools.ozone.report.closeReports',
          'tools.ozone.report.createActivity',
        ])
      },
    )
  },
)

it.each(scopes)(
  'reports failure instead of success if "$label" cannot close the current report',
  async ({ value }) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    state.scope = value
    supportsReportId = false
    failCurrentClosure = true
    await confirmNoAction()

    expect(currentClosed).toBe(false)
    expect(state.success).not.toHaveBeenCalled()
    expect(state.error).toHaveBeenCalledOnce()
    if (value !== 'current') {
      expect(state.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Closed 1 other reports, but could not close this report:',
        ),
      )
    }
  },
)
